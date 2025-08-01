/* MetaTree UI – v3: lane labels + commit captions */
(async () => {
  /* ---------- 1. LOAD + PREP ---------- */
  const raw = await fetch("mockdata.json").then((r) => r.json());

  const mainIdx = raw.branches.findIndex((b) => b.name === "main");
  const main = raw.branches[mainIdx];
  const orderedIdx = [mainIdx, ...(main.subs || [])];
  const restIdx = raw.branches
    .map((_, i) => i)
    .filter((i) => !orderedIdx.includes(i));
  const branchSeq = [...orderedIdx, ...restIdx].map((i) => raw.branches[i]);

  const data = {
    branches: branchSeq.map((b) => ({ ...b, commits: [...b.commits] })),
    merges: raw.merges.map((m) => ({ ...m })),
    nextId: 0,
    nextTime: 0,
  };
  data.merges.forEach((m) => {
    const t = data.branches.find((b) => b.name === m.target);
    if (t) t.commits.push({ ...m, merge: true });
  });

  const allNums = data.branches.flatMap((b) =>
    b.commits.map((c) => Number(c.id.slice(1)))
  );
  const allTimes = data.branches.flatMap((b) => b.commits.map((c) => c.time));
  data.nextId = Math.max(...allNums) + 1;
  data.nextTime = Math.max(...allTimes) + 1;

  /* ---------- 2. CONST ---------- */
  const X_GAP = 160,
    Y_GAP = 110,
    X_START = 100,
    Y_START = 70;
  const R = 12;
  const COLORS = [
    "#4c8bf5",
    "#8e44ad",
    "#27ae60",
    "#e67e22",
    "#d35400",
    "#e91e63",
  ];

  /* ---------- 3. CACHE ---------- */
  const $svg = document.getElementById("treeCanvas");
  const $labels = document.getElementById("branchLabels");
  const $log = document.getElementById("log");
  const $tip = (() => {
    const d = document.createElement("div");
    d.id = "metaTreeTooltip";
    document.body.appendChild(d);
    return d;
  })();
  document.getElementById("addCommit").onclick = addCommit;
  document.getElementById("addBranch").onclick = addBranch;
  document.getElementById("mergeBranch").onclick = mergeBranch;

  /* ---------- 4. RENDER ---------- */
  function render() {
    /* lane map */
    const laneOf = {};
    data.branches.forEach((b, i) => (laneOf[b.name] = i));

    /* flat commit list */
    const commits = data.branches
      .flatMap((b) => b.commits.map((c) => ({ ...c, branch: b.name })))
      .sort((a, b) => a.time - b.time);

    /* svg size */
    $svg.innerHTML = "";
    $svg.setAttribute("width", X_START + X_GAP * data.branches.length + 120);
    $svg.setAttribute("height", Y_START + Y_GAP * commits.length + 100);

    /* branch labels */
    $labels.innerHTML = "";
    data.branches.forEach((b) => {
      const lane = laneOf[b.name];
      const label = document.createElement("div");
      label.className = "branch-label";
      label.textContent = b.name;
      label.style.left = `${X_START + lane * X_GAP}px`;
      $labels.appendChild(label);
    });

    /* positions */
    const pos = {};
    commits.forEach((c, idx) => {
      pos[c.id] = {
        x: X_START + laneOf[c.branch] * X_GAP,
        y: Y_START + idx * Y_GAP,
      };
    });

    /* lane lines */
    data.branches.forEach((b) => {
      const lane = laneOf[b.name],
        x = X_START + lane * X_GAP;
      const ys = b.commits.map((c) => pos[c.id].y);
      if (!ys.length) return;
      drawLine(x, Math.min(...ys), x, Math.max(...ys), {
        stroke: COLORS[lane % COLORS.length],
        "stroke-width": 6,
        opacity: 0.15,
        class: "branch-back",
      });
    });

    /* parent links */
    commits.forEach((c) =>
      (c.parents || []).forEach((pid) => {
        if (!pos[pid]) return;
        drawLine(pos[pid].x, pos[pid].y, pos[c.id].x, pos[c.id].y, {
          stroke: COLORS[laneOf[c.branch] % COLORS.length],
          "stroke-width": 2,
          class: "commit-line",
        });
      })
    );

    /* nodes + captions */
    commits.forEach((c) => {
      const lane = laneOf[c.branch];
      const g = svgEl("g", { class: "commit" });
      const circle = svgEl("circle", {
        cx: pos[c.id].x,
        cy: pos[c.id].y,
        r: R,
        stroke: COLORS[lane % COLORS.length],
        fill: "#fff",
        "stroke-width": 3,
      });
      const label = svgEl("text", {
        x: pos[c.id].x + 18,
        y: pos[c.id].y + 4,
        class: "commit-label",
      });
      label.textContent = c.title || c.message;
      g.appendChild(circle);
      g.appendChild(label);
      $svg.appendChild(g);

      /* tooltip & log */
      g.addEventListener("mouseover", (e) => {
        $tip.innerHTML = `<strong>${c.title || c.message}</strong><br>${
          c.content || c.message
        }`;
        $tip.style.display = "block";
        moveTip(e);
      });
      g.addEventListener("mousemove", moveTip);
      g.addEventListener("mouseleave", () => ($tip.style.display = "none"));
      g.addEventListener("click", () => {
        $log.textContent = `[${c.id}] ${c.title || c.message}\nbranch: ${
          c.branch
        }\n${c.content || ""}`;
      });
    });
  }

  /* ---------- 5. HELPERS ---------- */
  const svgEl = (t, a) => {
    const e = document.createElementNS("http://www.w3.org/2000/svg", t);
    Object.entries(a).forEach(([k, v]) => e.setAttribute(k, v));
    return e;
  };
  const drawLine = (x1, y1, x2, y2, a) =>
    $svg.appendChild(svgEl("line", { x1, y1, x2, y2, ...a }));
  const moveTip = (e) => {
    $tip.style.left = `${e.pageX}px`;
    $tip.style.top = `${e.pageY}px`;
  };

  /* ---------- 6. MUTATIONS ---------- */
  const findBranch = (n) => data.branches.find((b) => b.name === n);
  const lastCommit = (b) => {
    const br = findBranch(b);
    return br && br.commits.length
      ? br.commits.reduce((a, c) => (a.time > c.time ? a : c))
      : null;
  };
  const newId = () => `c${data.nextId++}`;
  const newTime = () => data.nextTime++;

  function addCommit() {
    const bName = prompt("Commit 브랜치?", "main");
    const br = findBranch(bName);
    if (!br) return alert("❌ 브랜치 없음");
    const title = prompt("제목(회차)?", "임시 제목");
    if (title === null) return;
    const content = prompt("내용 요약?", "요약");
    if (content === null) return;

    br.commits.push({
      id: newId(),
      title,
      content,
      message: `${title}: ${content.slice(0, 30)}`,
      parents: lastCommit(bName) ? [lastCommit(bName).id] : [],
      time: newTime(),
    });
    render();
  }

  function addBranch() {
    const base = prompt("분기 기준 브랜치?", "main");
    const baseC = lastCommit(base);
    if (!baseC) return alert("❌ 기준 브랜치 없음");
    const name = prompt("새 브랜치 이름?", "arc/new");
    if (!name || findBranch(name)) return alert("❌ 이름 오류/중복");
    data.branches.push({
      name,
      commits: [
        {
          id: newId(),
          title: "분기 시작",
          content: "새로운 분기 시작",
          message: "branch start",
          parents: [baseC.id],
          time: newTime(),
        },
      ],
    });
    (findBranch("main").subs || (findBranch("main").subs = [])).push(
      data.branches.length - 1
    );
    render();
  }

  function mergeBranch() {
    const src = prompt("Source 브랜치?");
    const tgt = prompt("Target 브랜치?", "main");
    if (!src || !tgt || src === tgt) return;
    const srcC = lastCommit(src),
      tgtC = lastCommit(tgt);
    if (!srcC || !tgtC) return alert("❌ 브랜치 비어 있음");

    const title = prompt("머지 제목?", "병합");
    const content = prompt("머지 내용?", "분기 스토리 합류");
    const tBranch = findBranch(tgt);
    tBranch.commits.push({
      id: newId(),
      title,
      content,
      message: `Merge ${src}`,
      parents: [tgtC.id, srcC.id],
      time: newTime(),
      merge: true,
    });
    render();
  }

  /* ---------- 7. INIT ---------- */
  render();
})();
