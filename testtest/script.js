(async () => {
  /* CONFIG */
  const H_GAP = 120;          // horizontal spacing per commit
  const V_GAP = 90;           // vertical spacing per branch lane
  const RADIUS = 12;          // commit node radius
  const COLORS = ['#4c8bf5', '#8e44ad', '#27ae60', '#e67e22', '#d35400', '#e91e63'];

  /* LOAD DATA */
  const raw = await fetch('mockdata.json').then(r => r.json());

  /* PRE-PROCESS: add merge commits to target branch list */
  raw.merges.forEach(m => {
    const target = raw.branches.find(b => b.name === m.target);
    if (target) target.commits.push({ ...m, merge: true });
  });

  /* LANE MAPPING */
  const laneOf = {};               // branch -> lane index
  raw.branches.forEach((b, i) => laneOf[b.name] = i);

  /* FLATTEN COMMITS */
  const allCommits = [];
  raw.branches.forEach(b => {
    b.commits.forEach((c, idx) => {
      allCommits.push({ ...c, branch: b.name, order: allCommits.length });
    });
  });

  /* COORDINATES */
  const pos = {};                  // id -> { x, y }
  allCommits.forEach((c, i) => {
    const x = (i + 1) * H_GAP;
    const y = laneOf[c.branch] * V_GAP + 50;
    pos[c.id] = { x, y };
  });

  /* SVG */
  const svg = document.getElementById('treeCanvas');
  svg.setAttribute('height', V_GAP * raw.branches.length + 80);

  /* DRAW LINES (parents) */
  allCommits.forEach(c => {
    c.parents.forEach(pid => {
      const p = pos[pid];
      if (!p) return;                 // parent may be outside visible set
      const line = document.createElementNS('http://www.w3.org/2000/svg', 'line');
      line.setAttribute('x1', p.x);
      line.setAttribute('y1', p.y);
      line.setAttribute('x2', pos[c.id].x);
      line.setAttribute('y2', pos[c.id].y);
      line.setAttribute('class', 'commit-line');
      line.setAttribute('stroke', COLORS[laneOf[c.branch] % COLORS.length]);
      svg.appendChild(line);
    });
  });

  /* DRAW COMMIT NODES */
  allCommits.forEach(c => {
    const g = document.createElementNS('http://www.w3.org/2000/svg', 'g');
    g.setAttribute('class', 'commit');
    g.setAttribute('data-id', c.id);

    const circle = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
    circle.setAttribute('cx', pos[c.id].x);
    circle.setAttribute('cy', pos[c.id].y);
    circle.setAttribute('r', RADIUS);
    circle.setAttribute('stroke', COLORS[laneOf[c.branch] % COLORS.length]);

    g.appendChild(circle);
    svg.appendChild(g);

    /* SIMPLE LOG PANEL */
    g.addEventListener('click', () => {
      document.getElementById('log').textContent =
        `[${c.id}] ${c.message}  •  branch: ${c.branch}`;
    });
  });

  /* ---- OPTIONAL: interactive buttons (stub logic) ---- */
  document.getElementById('addCommit').onclick = () =>
    alert('TODO: implement “add commit” UI');
  document.getElementById('addBranch').onclick = () =>
    alert('TODO: implement “add branch” UI');
  document.getElementById('mergeBranch').onclick = () =>
    alert('TODO: implement “merge” UI');
})();