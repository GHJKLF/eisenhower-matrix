export default async function handler(req, res) {
  const token = process.env.CLICKUP_API_TOKEN;
  const spaceId = process.env.CLICKUP_SPACE_ID || "19304335";

  if (!token) {
    return res.status(500).json({ error: "CLICKUP_API_TOKEN not configured" });
  }

  // CORS
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET");

  try {
    // Get all folders in the space
    const foldersRes = await fetch(
      `https://api.clickup.com/api/v2/space/${spaceId}/folder?archived=false`,
      { headers: { Authorization: token } }
    );
    const foldersData = await foldersRes.json();
    const folders = foldersData.folders || [];

    // Get all lists: folderless lists + lists inside folders
    const folderlessRes = await fetch(
      `https://api.clickup.com/api/v2/space/${spaceId}/list?archived=false`,
      { headers: { Authorization: token } }
    );
    const folderlessData = await folderlessRes.json();
    let allLists = folderlessData.lists || [];

    for (const folder of folders) {
      const listsRes = await fetch(
        `https://api.clickup.com/api/v2/folder/${folder.id}/list?archived=false`,
        { headers: { Authorization: token } }
      );
      const listsData = await listsRes.json();
      allLists = allLists.concat(listsData.lists || []);
    }

    // Fetch tasks from each list
    let allTasks = [];
    for (const list of allLists) {
      const tasksRes = await fetch(
        `https://api.clickup.com/api/v2/list/${list.id}/task?archived=false&include_closed=false&subtasks=true`,
        { headers: { Authorization: token } }
      );
      const tasksData = await tasksRes.json();
      const tasks = (tasksData.tasks || []).map((t) => ({
        id: t.id,
        name: t.name,
        status: t.status?.status || "unknown",
        statusColor: t.status?.color || "#888",
        priority: t.priority?.priority || "none",
        priorityId: t.priority?.id ? parseInt(t.priority.id) : 5,
        url: t.url,
        list: list.name,
        folder: t.folder?.name || null,
        assignees: (t.assignees || []).map((a) => ({
          id: a.id,
          username: a.username,
          initials: a.initials,
          profilePicture: a.profilePicture,
        })),
        dueDate: t.due_date ? new Date(parseInt(t.due_date)).toISOString() : null,
        dateCreated: t.date_created,
        dateUpdated: t.date_updated,
        tags: (t.tags || []).map((tag) => tag.name),
      }));
      allTasks = allTasks.concat(tasks);
    }

    // Filter out completed/closed tasks
    const activeTasks = allTasks.filter(
      (t) =>
        !["complete", "closed", "done", "cancelled"].includes(
          t.status.toLowerCase()
        )
    );

    // Map priority to quadrants
    const quadrants = {
      q1: { title: "Do First", subtitle: "Urgent + Important", tasks: [] },
      q2: { title: "Schedule", subtitle: "Important + Not Urgent", tasks: [] },
      q3: { title: "Delegate", subtitle: "Urgent + Not Important", tasks: [] },
      q4: { title: "Backlog", subtitle: "Not Urgent + Not Important", tasks: [] },
      unassigned: { title: "No Priority", subtitle: "Assign a priority in ClickUp", tasks: [] },
    };

    for (const task of activeTasks) {
      switch (task.priorityId) {
        case 1:
          quadrants.q1.tasks.push(task);
          break;
        case 2:
          quadrants.q2.tasks.push(task);
          break;
        case 3:
          quadrants.q3.tasks.push(task);
          break;
        case 4:
          quadrants.q4.tasks.push(task);
          break;
        default:
          quadrants.unassigned.tasks.push(task);
      }
    }

    // Sort each quadrant by date updated (most recent first)
    for (const q of Object.values(quadrants)) {
      q.tasks.sort((a, b) => (b.dateUpdated || 0) - (a.dateUpdated || 0));
    }

    return res.status(200).json({
      quadrants,
      meta: {
        totalTasks: activeTasks.length,
        space: spaceId,
        syncedAt: new Date().toISOString(),
      },
    });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
}
