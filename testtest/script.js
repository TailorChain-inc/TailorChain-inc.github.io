/* MetaTree UI – v4: 2-branch limit + spinner-driven flows + dynamic segments */
(async () => {
  /* ---------- 0. OPTION SETS (스피너) ---------- */
  const FLOW_OPTIONS = [
    "추리형 전개",
    "액션 고조",
    "감정 회상",
    "정보 공개",
    "반전 회차",
    "휴지기",
  ];
  const CONCEPT_OPTIONS = [
    "회귀",
    "성좌 계약",
    "토너먼트",
    "정치 스릴러",
    "로맨스 서브",
    "세계관 해설",
  ];
  const MERGE_OUTCOMES = [
    "루프 종료 및 합류",
    "장치 획득 후 합류",
    "갈등 봉합 및 합류",
    "임시 휴전 합류",
  ];

  /* ---------- 1. LOAD & PREP ---------- */
  const raw = await fetch("mockdata.json").then((r) => r.json());

  const mainIdx = raw.branches.findIndex((b) => b.name === "main");
  const main = raw.branches[mainIdx] || raw.branches[0];
  if (!main.meta) main.meta = {};
  if (!main.subs) main.subs = [];

  const orderedIdx = [mainIdx, ...(main.subs || [])].filter((i) => i >= 0);
  const restIdx = raw.branches
    .map((_, i) => i)
    .filter((i) => !orderedIdx.includes(i));
  const branchSeq = [...orderedIdx, ...restIdx].map((i) => raw.branches[i]);

  const data = {
    branches: branchSeq.map((b) => ({
      ...b,
      meta: { segments: [], ...(b.meta || {}) },
      commits: [...b.commits],
    })),
    merges: (raw.merges || []).map((m) => ({ ...m })),
    nextId: 0,
    nextTime: 0,
  };

  // insert merges into target branch for drawing
  data.merges.forEach((m) => {
    const t = data.branches.find((b) => b.name === m.target);
    if (t) t.commits.push({ ...m, merge: true });
  });

  const allNums = data.branches
    .flatMap((b) => b.commits.map((c) => Number((c.id || "c0").slice(1))))
    .filter((n) => !isNaN(n));
  const allTimes = data.branches.flatMap((b) =>
    b.commits.map((c) => c.time || 0)
  );
  data.nextId = (allNums.length ? Math.max(...allNums) : 0) + 1;
  data.nextTime = (allTimes.length ? Math.max(...allTimes) : 0) + 1;

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

  /* ---------- 3. CACHE DOM ---------- */
  const $svg = document.getElementById("treeCanvas");
  const $labels = document.getElementById("branchLabels");
  const $log = document.getElementById("log");
  const $tip = createTip();

  // Panel controls
  const $baseSel = document.getElementById("branchBaseSelect");
  const $nameInp = document.getElementById("branchNameInput");
  const $flowSel = document.getElementById("branchFlowSelect");
  const $concSel = document.getElementById("branchConceptSelect");
  const $createBtn = document.getElementById("createBranchBtn");

  const $mergeSrcSel = document.getElementById("mergeSourceSelect");
  const $mergeOutcomeSel = document.getElementById("mergeOutcomeSelect");
  const $mergeBtn = document.getElementById("mergeBtn");

  const $segBranchSel = document.getElementById("segmentBranchSelect");
  const $segFrom = document.getElementById("segmentFrom");
  const $segTo = document.getElementById("segmentTo");
  const $segFlowSel = document.getElementById("segmentFlowSelect");
  const $segConceptSel = document.getElementById("segmentConceptSelect");
  const $segAddBtn = document.getElementById("addSegmentBtn");
  const $segList = document.getElementById("segmentList");

  // Header buttons trigger panel actions
  document.getElementById("addBranchHeader").onclick = () => $createBtn.click();
  document.getElementById("mergeBranchHeader").onclick = () =>
    $mergeBtn.click();
  document.getElementById("addCommit").onclick = addCommitPrompt;

  /* ---------- 4. INIT SPINNERS ---------- */
  fillOptions($flowSel, FLOW_OPTIONS);
  fillOptions($concSel, CONCEPT_OPTIONS);
  fillOptions($mergeOutcomeSel, MERGE_OUTCOMES);
  fillOptions($segFlowSel, FLOW_OPTIONS);
  fillOptions($segConceptSel, CONCEPT_OPTIONS);

  updateBranchSelects();

  $createBtn.onclick = createBranchFromPanel;
  $mergeBtn.onclick = mergeFromPanel;
  $segAddBtn.onclick = addSegmentFromPanel;
  $segBranchSel.onchange = renderSegmentsList;

  /* ---------- 5. RENDER TREE ---------- */
  function render() {
    const laneOf = {};
    data.branches.forEach((b, i) => (laneOf[b.name] = i));

    const commits = data.branches
      .flatMap((b) => b.commits.map((c) => ({ ...c, branch: b.name })))
      .sort((a, b) => (a.time || 0) - (b.time || 0));

    $svg.innerHTML = "";
    $svg.setAttribute("width", X_START + X_GAP * data.branches.length + 120);
    $svg.setAttribute("height", Y_START + Y_GAP * commits.length + 100);

    // Branch labels + segment pills
    $labels.innerHTML = "";
    data.branches.forEach((b) => {
      const lane = laneOf[b.name];
      const x = X_START + lane * X_GAP;

      const label = document.createElement("div");
      label.className = "branch-label";
      label.textContent = b.name;
      label.style.left = `${x}px`;
      $labels.appendChild(label);

      // segment pills (display only meta.segments)
      (b.meta?.segments || []).forEach((seg, idx) => {
        const pill = document.createElement("div");
        pill.className = "segment-pill";
        pill.style.left = `${x}px`;
        pill.style.top = `${24 + idx * 24}px`;
        pill.textContent = `${seg.from}-${seg.to} ${seg.flow}/${seg.concept}`;
        $labels.appendChild(pill);
      });
    });

    // Position map
    const pos = {};
    commits.forEach(
      (c, idx) =>
        (pos[c.id] = {
          x: X_START + laneOf[c.branch] * X_GAP,
          y: Y_START + idx * Y_GAP,
        })
    );

    // Lane lines
    data.branches.forEach((b) => {
      const lane = laneOf[b.name],
        x = X_START + lane * X_GAP;
      const ys = b.commits.map((c) => pos[c.id]?.y).filter(Boolean);
      if (!ys.length) return;
      drawLine(x, Math.min(...ys), x, Math.max(...ys), {
        stroke: COLORS[lane % COLORS.length],
        "stroke-width": 6,
        opacity: 0.15,
        class: "branch-back",
      });
    });

    // Parent links
    commits.forEach((c) =>
      (c.parents || []).forEach((pid) => {
        if (!pos[pid] || !pos[c.id]) return;
        drawLine(pos[pid].x, pos[pid].y, pos[c.id].x, pos[c.id].y, {
          stroke: COLORS[laneOf[c.branch] % COLORS.length],
          "stroke-width": 2,
          class: "commit-line",
        });
      })
    );

    // Nodes + captions
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

  /* ---------- 6. PANEL ACTIONS ---------- */
  function createBranchFromPanel() {
    const currentSubCount = data.branches.filter(
      (b) => b.name !== "main"
    ).length;
    if (currentSubCount >= 2) {
      alert("서브 브랜치는 최대 2개까지만 생성할 수 있습니다.");
      return;
    }

    const base = $baseSel.value || "main";
    const baseHead = lastCommit(base);
    if (!baseHead) return alert("❌ 기준 브랜치가 비어 있습니다.");

    const name = ($nameInp.value || "").trim();
    if (!name) return alert("브랜치 이름을 입력하세요.");
    if (findBranch(name)) return alert("이미 존재하는 브랜치입니다.");

    const flow = $flowSel.value || "일반 전개";
    const concept = $concSel.value || "일반 컨셉";

    pushBranch({
      name,
      commits: [
        {
          id: newId(),
          title: "분기 시작",
          content: `흐름: ${flow}, 컨셉: ${concept}`,
          message: `branch start: ${flow} / ${concept}`,
          parents: [baseHead.id],
          time: newTime(),
        },
      ],
      meta: { segments: [{ from: 1, to: 1, flow, concept }] },
    });

    updateBranchSelects();
    render();
    $log.textContent = `브랜치 생성: ${name}\n흐름:${flow} / 컨셉:${concept}`;
  }

  function mergeFromPanel() {
    const src = $mergeSrcSel.value;
    if (!src) return alert("Source 브랜치를 선택하세요.");
    const tgt = "main";
    if (src === tgt) return alert("같은 브랜치는 병합할 수 없습니다.");

    const srcC = lastCommit(src),
      tgtC = lastCommit(tgt);
    if (!srcC || !tgtC) return alert("❌ 소스/타깃 브랜치가 비어 있습니다.");

    const outcome = $mergeOutcomeSel.value || "합류";
    const tBranch = findBranch(tgt);

    tBranch.commits.push({
      id: newId(),
      title: `병합: ${src}`,
      content: `병합 의도: ${outcome}`,
      message: `Merge ${src}`,
      parents: [tgtC.id, srcC.id],
      time: newTime(),
      merge: true,
    });

    render();
    $log.textContent = `병합 완료: ${src} → ${tgt} (${outcome})`;
  }

  function addSegmentFromPanel() {
    const bName = $segBranchSel.value;
    if (!bName) return alert("브랜치를 선택하세요.");
    const br = findBranch(bName);
    if (!br) return;

    const from = Number($segFrom.value);
    const to = Number($segTo.value);
    if (!from || !to || from > to) return alert("유효한 화 범위를 입력하세요.");

    const flow = $segFlowSel.value || "일반 전개";
    const concept = $segConceptSel.value || "일반 컨셉";

    br.meta.segments = br.meta.segments || [];
    br.meta.segments.push({ from, to, flow, concept });

    renderSegmentsList();
    render(); // pills 갱신
  }

  /* ---------- 7. MISC: Add Commit (prompt) ---------- */
  function addCommitPrompt() {
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

  /* ---------- 8. RENDER SEGMENTS PANEL ---------- */
  function renderSegmentsList() {
    const name = $segBranchSel.value;
    const br = findBranch(name);
    $segList.innerHTML = "";
    if (!br) return;

    (br.meta?.segments || []).forEach((s, i) => {
      const li = document.createElement("li");
      li.className = "pill";
      li.textContent = `${s.from}-${s.to} ${s.flow}/${s.concept}`;
      // 삭제 버튼
      const del = document.createElement("button");
      del.textContent = "×";
      del.style.marginLeft = "8px";
      del.onclick = () => {
        br.meta.segments.splice(i, 1);
        renderSegmentsList();
        render();
      };
      li.appendChild(del);
      $segList.appendChild(li);
    });
  }

  /* ---------- 9. UTILS ---------- */
  function createTip() {
    const d = document.createElement("div");
    d.id = "metaTreeTooltip";
    document.body.appendChild(d);
    return d;
  }
  function moveTip(e) {
    document.getElementById("metaTreeTooltip").style.left = `${e.pageX}px`;
    document.getElementById("metaTreeTooltip").style.top = `${e.pageY}px`;
  }
  function svgEl(t, a) {
    const e = document.createElementNS("http://www.w3.org/2000/svg", t);
    Object.entries(a).forEach(([k, v]) => e.setAttribute(k, v));
    return e;
  }
  function drawLine(x1, y1, x2, y2, a) {
    $svg.appendChild(svgEl("line", { x1, y1, x2, y2, ...a }));
  }
  function fillOptions(sel, arr) {
    sel.innerHTML = arr
      .map((v) => `<option value="${v}">${v}</option>`)
      .join("");
  }
  function updateBranchSelects() {
    const names = data.branches.map((b) => b.name);
    $baseSel.innerHTML = names
      .map((n) => `<option value="${n}">${n}</option>`)
      .join("");
    $mergeSrcSel.innerHTML = names
      .filter((n) => n !== "main")
      .map((n) => `<option value="${n}">${n}</option>`)
      .join("");
    $segBranchSel.innerHTML = names
      .map((n) => `<option value="${n}">${n}</option>`)
      .join("");
    renderSegmentsList();
  }
  function findBranch(n) {
    return data.branches.find((b) => b.name === n);
  }
  function lastCommit(b) {
    const br = findBranch(b);
    if (!br || !br.commits.length) return null;
    return br.commits.reduce((a, c) => ((a.time || 0) > (c.time || 0) ? a : c));
  }
  function newId() {
    return `c${data.nextId++}`;
  }
  function newTime() {
    return data.nextTime++;
  }
  function pushBranch(obj) {
    data.branches.push({ ...obj, meta: { segments: [], ...(obj.meta || {}) } });
    // main.subs 갱신
    const m = findBranch("main");
    if (m) {
      if (!Array.isArray(m.subs)) m.subs = [];
      m.subs.push(data.branches.length - 1);
    }
  }

  /* ---------- 10. FIRST PAINT ---------- */
  render();
})();
