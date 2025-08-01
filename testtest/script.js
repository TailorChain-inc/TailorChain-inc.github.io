(async () => {
  /* ───────── CONFIG ───────── */
  const X_GAP = 140; // horizontal distance between branch lanes
  const Y_GAP = 100; // vertical distance between chronological commits
  const RADIUS = 12; // commit node radius
  const X_START = 90; // left margin
  const Y_START = 60; // top margin
  const COLORS = [
    "#4c8bf5",
    "#8e44ad",
    "#27ae60",
    "#e67e22",
    "#d35400",
    "#e91e63",
  ];

  /* ───────── LOAD DATA ───────── */
  const raw = await fetch("mockdata.json").then((r) => r.json());

  /* attach merge commits to their target branch list for drawing */
  raw.merges.forEach((m) => {
    const t = raw.branches.find((b) => b.name === m.target);
    if (t) t.commits.push({ ...m, merge: true });
  });

  /* lane index per branch */
  const laneOf = {};
  raw.branches.forEach((b, i) => (laneOf[b.name] = i));

  /* flatten commits & sort by time */
  const allCommits = [];
  raw.branches.forEach((b) =>
    b.commits.forEach((c) => allCommits.push({ ...c, branch: b.name }))
  );
  allCommits.sort((a, b) => a.time - b.time);

  /* coordinates */
  const pos = {};
  allCommits.forEach((c, idx) => {
    const x = X_START + laneOf[c.branch] * X_GAP;
    const y = Y_START + idx * Y_GAP;
    pos[c.id] = { x, y };
  });

  /* ───────── SVG CANVAS ───────── */
  const svg = document.getElementById("treeCanvas");
  svg.setAttribute("width", X_START + X_GAP * raw.branches.length + 100);
  svg.setAttribute("height", Y_START + Y_GAP * allCommits.length + 100);

  /* branch vertical guides (draw first so they stay behind) */
  raw.branches.forEach((b) => {
    const x = X_START + laneOf[b.name] * X_GAP;
    const commitsInBranch = allCommits.filter((c) => c.branch === b.name);
    if (!commitsInBranch.length) return;
    const yMin = Math.min(...commitsInBranch.map((c) => pos[c.id].y));
    const yMax = Math.max(...commitsInBranch.map((c) => pos[c.id].y));
    const line = document.createElementNS("http://www.w3.org/2000/svg", "line");
    line.setAttribute("x1", x);
    line.setAttribute("y1", yMin);
    line.setAttribute("x2", x);
    line.setAttribute("y2", yMax);
    line.setAttribute("class", "branch-back");
    line.setAttribute("stroke", COLORS[laneOf[b.name] % COLORS.length]);
    svg.appendChild(line);
  });

  /* parent-child links */
  allCommits.forEach((c) => {
    c.parents.forEach((pid) => {
      const p = pos[pid];
      if (!p) return;
      const line = document.createElementNS(
        "http://www.w3.org/2000/svg",
        "line"
      );
      line.setAttribute("x1", p.x);
      line.setAttribute("y1", p.y);
      line.setAttribute("x2", pos[c.id].x);
      line.setAttribute("y2", pos[c.id].y);
      line.setAttribute("class", "commit-line");
      line.setAttribute("stroke", COLORS[laneOf[c.branch] % COLORS.length]);
      svg.appendChild(line);
    });
  });

  /* commit nodes */
  allCommits.forEach((c) => {
    const g = document.createElementNS("http://www.w3.org/2000/svg", "g");
    g.setAttribute("class", "commit");

    const circle = document.createElementNS(
      "http://www.w3.org/2000/svg",
      "circle"
    );
    circle.setAttribute("cx", pos[c.id].x);
    circle.setAttribute("cy", pos[c.id].y);
    circle.setAttribute("r", RADIUS);
    circle.setAttribute("stroke", COLORS[laneOf[c.branch] % COLORS.length]);

    /* title provides native tooltip */
    const title = document.createElementNS(
      "http://www.w3.org/2000/svg",
      "title"
    );
    title.textContent = `[${c.id}] ${c.message}`;

    g.appendChild(circle);
    g.appendChild(title);
    svg.appendChild(g);

    /* click log */
    g.addEventListener("click", () => {
      document.getElementById(
        "log"
      ).textContent = `[${c.id}] ${c.message} • branch: ${c.branch}`;
    });
  });

  /* ───────── stub interactive buttons ───────── */
  document.getElementById("addCommit").onclick = () =>
    alert("TODO: add commit");
  document.getElementById("addBranch").onclick = () =>
    alert("TODO: add branch");
  document.getElementById("mergeBranch").onclick = () =>
    alert("TODO: merge branch");
})();
