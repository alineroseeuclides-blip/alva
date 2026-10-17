
(() => {
  "use strict";

  const $ = (id) => document.getElementById(id);
  const TODAY = dateKey(new Date());
  const STORAGE_KEY = "alva-app-v1";
  const PAGE_TITLES = {
    inicio: "Visão geral",
    rotina: "Minha rotina",
    estudos: "Meus estudos",
    treinos: "Meus treinos",
    habitos: "Meus hábitos",
    configuracoes: "Configurações"
  };

  function dateKey(date) {
    return [
      date.getFullYear(),
      String(date.getMonth() + 1).padStart(2, "0"),
      String(date.getDate()).padStart(2, "0")
    ].join("-");
  }

  function makeId() {
    return window.crypto?.randomUUID?.() ||
      Date.now().toString(36) + Math.random().toString(36).slice(2);
  }

  function defaultState() {
    return {
      tasks: [],
      studies: [],
      workouts: [],
      habits: [
        { id: "water", name: "Beber água", icon: "💧", days: [] },
        { id: "reading", name: "Ler um pouco", icon: "📚", days: [] },
        { id: "rest", name: "Ter um momento de descanso", icon: "☁️", days: [] }
      ],
      settings: { name: "" }
    };
  }

  function loadState() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return defaultState();

      const saved = JSON.parse(raw);
      const defaults = defaultState();

      return {
        ...defaults,
        ...saved,
        tasks: Array.isArray(saved.tasks) ? saved.tasks : [],
        studies: Array.isArray(saved.studies) ? saved.studies : [],
        workouts: Array.isArray(saved.workouts) ? saved.workouts : [],
        habits: Array.isArray(saved.habits) ? saved.habits : defaults.habits,
        settings: { ...defaults.settings, ...saved.settings }
      };
    } catch (error) {
      console.error("Não foi possível carregar os dados do ALVA.", error);
      return defaultState();
    }
  }

  let state = loadState();
  let currentPage = "inicio";

  function saveState() {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
      return true;
    } catch (error) {
      alert("Não foi possível salvar os dados. Confira o espaço disponível no navegador.");
      console.error(error);
      return false;
    }
  }

  function escapeHTML(value) {
    return String(value).replace(/[&<>"']/g, (character) => ({
      "&": "&amp;",
      "<": "&lt;",
      ">": "&gt;",
      '"': "&quot;",
      "'": "&#39;"
    })[character]);
  }

  function todayTasks() {
    return state.tasks.filter((task) => task.day === TODAY);
  }

  function todayStudies() {
    return state.studies.filter((item) => item.day === TODAY);
  }

  function todayWorkouts() {
    return state.workouts.filter((item) => item.day === TODAY);
  }

  function completedHabits() {
    return state.habits.filter((habit) => habit.days.includes(TODAY));
  }

  function showDate() {
    const date = new Date();
    $("top-date").textContent = date.toLocaleDateString("pt-BR", {
      weekday: "long",
      day: "numeric",
      month: "long"
    }).toUpperCase();
  }

  function navigate(page) {
    if (!PAGE_TITLES[page]) return;
    currentPage = page;

    document.querySelectorAll(".page").forEach((section) => {
      section.classList.toggle("active", section.id === "page-" + page);
    });

    document.querySelectorAll("[data-page]").forEach((button) => {
      const active = button.dataset.page === page;
      button.classList.toggle("active", active);
      if (active) button.setAttribute("aria-current", "page");
      else button.removeAttribute("aria-current");
    });

    $("page-heading").textContent = PAGE_TITLES[page];
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function emptyState(message) {
    return `<div class="empty-state">${escapeHTML(message)}</div>`;
  }

  function taskMarkup(task, compact = false) {
    const details = [
      task.time ? "⏰ " + escapeHTML(task.time) : "",
      escapeHTML(task.category || "Pessoal")
    ].filter(Boolean).join(" · ");

    return `
      <div class="list-item ${task.done ? "is-done" : ""}">
        <input class="item-check" type="checkbox"
          data-task-check="${escapeHTML(task.id)}"
          ${task.done ? "checked" : ""}
          aria-label="Concluir ${escapeHTML(task.title)}">
        <div class="item-main">
          <strong>${escapeHTML(task.title)}</strong>
          <small>${details}</small>
        </div>
        ${compact ? "" : `<button class="item-action" data-task-delete="${escapeHTML(task.id)}" aria-label="Excluir tarefa" title="Excluir">×</button>`}
      </div>`;
  }

  function habitMarkup(habit) {
    const done = habit.days.includes(TODAY);
    const icon = habit.icon || "✳";

    return `
      <div class="list-item ${done ? "is-done" : ""}">
        <div class="stat-icon blue-icon">${escapeHTML(icon)}</div>
        <div class="item-main">
          <strong>${escapeHTML(habit.name)}</strong>
          <div class="habit-progress"><span style="width:${done ? 100 : 0}%"></span></div>
          <small>${done ? "Concluído hoje ✨" : "Um pequeno passo de cada vez"}</small>
        </div>
        <button class="habit-toggle" data-habit-toggle="${escapeHTML(habit.id)}"
          aria-pressed="${done}">${done ? "✓ Feito" : "Marcar"}</button>
        <button class="item-action" data-habit-delete="${escapeHTML(habit.id)}"
          aria-label="Excluir hábito" title="Excluir hábito">×</button>
      </div>`;
  }

  function studyMarkup(item) {
    return `
      <div class="list-item">
        <div class="stat-icon lilac-icon">▤</div>
        <div class="item-main">
          <strong>${escapeHTML(item.subject)}</strong>
          <small>${item.minutes} min${item.notes ? " · " + escapeHTML(item.notes) : ""}</small>
        </div>
        <button class="item-action" data-study-delete="${escapeHTML(item.id)}"
          aria-label="Excluir sessão de estudo" title="Excluir">×</button>
      </div>`;
  }

  function workoutMarkup(item) {
    return `
      <div class="list-item">
        <div class="stat-icon peach-icon">⌁</div>
        <div class="item-main">
          <strong>${escapeHTML(item.type)}</strong>
          <small>${item.minutes} min${item.notes ? " · " + escapeHTML(item.notes) : ""}</small>
        </div>
        <button class="item-action" data-workout-delete="${escapeHTML(item.id)}"
          aria-label="Excluir atividade" title="Excluir">×</button>
      </div>`;
  }

  function renderDashboard() {
    const tasks = todayTasks();
    const doneTasks = tasks.filter((task) => task.done).length;
    const studies = todayStudies();
    const doneHabits = completedHabits();

    $("stat-tasks").textContent = `${doneTasks}/${tasks.length}`;
    $("stat-study").textContent = String(studies.length);
    $("stat-habits").textContent = `${doneHabits.length}/${state.habits.length}`;

    $("dashboard-tasks").innerHTML = tasks.length
      ? tasks.slice(0, 5).map((task) => taskMarkup(task, true)).join("")
      : emptyState("Seu dia está aberto para novas possibilidades. Adicione uma tarefa na sua rotina.");

    $("dashboard-habits").innerHTML = state.habits.length
      ? state.habits.slice(0, 4).map(habitMarkup).join("")
      : emptyState("Crie seu primeiro hábito para começar.");
  }

  function renderTasks() {
    const tasks = todayTasks();
    const filter = $("task-filter").value;

    const filtered = tasks.filter((task) => {
      if (filter === "pendentes") return !task.done;
      if (filter === "concluidas") return task.done;
      return true;
    });

    $("task-summary").textContent =
      `${tasks.filter((task) => task.done).length} de ${tasks.length} concluídas`;

    $("all-tasks").innerHTML = filtered.length
      ? filtered
          .slice()
          .sort((a, b) => (a.time || "99:99").localeCompare(b.time || "99:99"))
          .map((task) => taskMarkup(task))
          .join("")
      : emptyState(
          tasks.length
            ? "Nenhuma tarefa corresponde a esse filtro."
            : "Você ainda não adicionou tarefas para hoje."
        );
  }

  function renderStudies() {
    const studies = todayStudies();
    const total = studies.reduce((sum, item) => sum + item.minutes, 0);

    $("study-total").textContent = total >= 60
      ? `${Math.floor(total / 60)}h${total % 60 ? " " + total % 60 + "min" : ""}`
      : `${total} min`;

    $("study-sessions").textContent = String(studies.length);
    $("study-list").innerHTML = studies.length
      ? studies.slice().reverse().map(studyMarkup).join("")
      : emptyState("Suas sessões de estudo aparecerão aqui depois que você registrar a primeira.");
  }

  function renderWorkouts() {
    const workouts = todayWorkouts();
    $("workout-list").innerHTML = workouts.length
      ? workouts.slice().reverse().map(workoutMarkup).join("")
      : emptyState("Ainda não há atividades registradas para hoje.");
  }

  function renderHabits() {
    const done = completedHabits().length;
    $("habit-summary").textContent =
      `${done} de ${state.habits.length} hábitos concluídos hoje.`;

    $("habit-list").innerHTML = state.habits.length
      ? state.habits.map(habitMarkup).join("")
      : emptyState("Adicione um hábito que você gostaria de cultivar.");
  }

  function renderSettings() {
    $("user-name").value = state.settings.name || "";
    const profileName = state.settings.name.trim() || "Meu espaço";
    document.querySelector(".profile strong").textContent = profileName;

    const greeting = $("page-inicio").querySelector("h1");
    greeting.innerHTML = `Oi, ${escapeHTML(state.settings.name.trim() || "você")}. <span>✳</span>`;
  }

  function render() {
    renderDashboard();
    renderTasks();
    renderStudies();
    renderWorkouts();
    renderHabits();
    renderSettings();
  }

  function addTask(event) {
    event.preventDefault();
    const input = $("task-title");
    const title = input.value.trim();
    if (!title) return;

    state.tasks.push({
      id: makeId(),
      title,
      time: $("task-time").value,
      category: $("task-category").value,
      day: TODAY,
      done: false
    });

    if (saveState()) {
      input.value = "";
      $("task-time").value = "";
      render();
      input.focus();
    }
  }

  function addStudy(event) {
    event.preventDefault();
    const subject = $("study-subject").value.trim();
    if (!subject) return;

    state.studies.push({
      id: makeId(),
      subject,
      minutes: Number($("study-duration").value),
      notes: $("study-notes").value.trim(),
      day: TODAY
    });

    if (saveState()) {
      $("study-form").reset();
      $("study-duration").value = "25";
      render();
    }
  }

  function addWorkout(event) {
    event.preventDefault();

    state.workouts.push({
      id: makeId(),
      type: $("workout-type").value,
      minutes: Number($("workout-duration").value),
      notes: $("workout-notes").value.trim(),
      day: TODAY
    });

    if (saveState()) {
      $("workout-form").reset();
      $("workout-duration").value = "30";
      render();
    }
  }

  function addHabit(event) {
    event.preventDefault();
    const input = $("habit-title");
    const name = input.value.trim();
    if (!name) return;

    state.habits.push({
      id: makeId(),
      name,
      icon: "✳",
      days: []
    });

    if (saveState()) {
      input.value = "";
      render();
      input.focus();
    }
  }

  function handleClick(event) {
    const button = event.target.closest("button");
    if (!button) return;

    if (button.dataset.page) {
      navigate(button.dataset.page);
      return;
    }

    if (button.dataset.go) {
      navigate(button.dataset.go);
      return;
    }

    if (button.id === "quick-add") {
      navigate("rotina");
      $("task-title").focus();
      return;
    }

    if (button.dataset.habitToggle) {
      const habit = state.habits.find((item) => item.id === button.dataset.habitToggle);
      if (!habit) return;

      if (habit.days.includes(TODAY)) {
        habit.days = habit.days.filter((day) => day !== TODAY);
      } else {
        habit.days.push(TODAY);
      }

      if (saveState()) render();
      return;
    }

    if (button.dataset.taskDelete) {
      state.tasks = state.tasks.filter((item) => item.id !== button.dataset.taskDelete);
      if (saveState()) render();
      return;
    }

    if (button.dataset.habitDelete) {
      state.habits = state.habits.filter((item) => item.id !== button.dataset.habitDelete);
      if (saveState()) render();
      return;
    }

    if (button.dataset.studyDelete) {
      state.studies = state.studies.filter((item) => item.id !== button.dataset.studyDelete);
      if (saveState()) render();
      return;
    }

    if (button.dataset.workoutDelete) {
      state.workouts = state.workouts.filter((item) => item.id !== button.dataset.workoutDelete);
      if (saveState()) render();
    }
  }

  function handleChange(event) {
    const input = event.target;
    if (!input.matches("[data-task-check]")) return;

    const task = state.tasks.find((item) => item.id === input.dataset.taskCheck);
    if (!task) return;

    task.done = input.checked;
    if (saveState()) render();
  }

  function saveSettings() {
    state.settings.name = $("user-name").value.trim();

    if (saveState()) {
      renderSettings();
      alert("Preferências salvas! 💙");
    }
  }

  function clearData() {
    const confirmed = confirm(
      "Tem certeza de que deseja apagar todas as tarefas, sessões, atividades, hábitos e preferências salvos neste navegador? Essa ação não pode ser desfeita."
    );

    if (!confirmed) return;

    state = defaultState();

    try {
      localStorage.removeItem(STORAGE_KEY);
    } catch (error) {
      console.error(error);
    }

    render();
    navigate("inicio");
    alert("Os dados locais foram apagados.");
  }

  function init() {
    showDate();

    document.addEventListener("click", handleClick);
    document.addEventListener("change", handleChange);

    $("task-form").addEventListener("submit", addTask);
    $("task-filter").addEventListener("change", renderTasks);
    $("study-form").addEventListener("submit", addStudy);
    $("workout-form").addEventListener("submit", addWorkout);
    $("habit-form").addEventListener("submit", addHabit);
    $("save-settings").addEventListener("click", saveSettings);
    $("clear-data").addEventListener("click", clearData);

    render();
    navigate("inicio");
  }

  init();
})();
