const chatbotRoot = document.querySelector("[data-chatbot]");

if (chatbotRoot) {
  const launcher = chatbotRoot.querySelector(".chatbot-launcher");
  const panel = chatbotRoot.querySelector(".chatbot-panel");
  const closeButton = chatbotRoot.querySelector(".chatbot-close");
  const statusNode = chatbotRoot.querySelector("[data-chatbot-status]");
  const messagesNode = chatbotRoot.querySelector("[data-chatbot-messages]");
  const suggestionsNode = chatbotRoot.querySelector("[data-chatbot-suggestions]");
  const form = chatbotRoot.querySelector("[data-chatbot-form]");
  const input = chatbotRoot.querySelector("[data-chatbot-input]");
  const sendButton = chatbotRoot.querySelector(".chatbot-send");

  const knowledgeState = {
    loading: false,
    ready: false,
    error: "",
    sections: [],
  };

  const STOP_WORDS = new Set([
    "a", "anh", "ba", "ban", "bi", "bo", "chi", "cho", "co", "cua", "da", "dang", "de",
    "den", "du", "duoc", "gi", "gioi", "gom", "he", "hay", "hoc", "khi", "khong", "la",
    "lam", "len", "loai", "mot", "nay", "nao", "neu", "nhu", "nhung", "nguoi", "o", "oi",
    "phan", "qua", "ra", "se", "su", "tai", "the", "thi", "tren", "toi", "tu", "vao", "ve",
    "va", "voi", "what", "which", "who", "why", "how", "when",
  ]);

  const GREETING_PATTERNS = ["xin chao", "chao", "hello", "hi", "alo"];

  const TOPIC_PROFILES = [
    {
      id: "overview",
      lead: "Tóm tắt nhanh về dự án:",
      keywords: ["du an", "san pham", "he thong", "tong quan", "muc tieu", "gioi thieu"],
      titleHints: ["ten de tai", "boi canh", "muc tieu du an", "ket luan"],
    },
    {
      id: "technology",
      lead: "Công nghệ chính đang được sử dụng:",
      keywords: ["cong nghe", "ai", "yolo", "efficientnet", "cnn", "camera", "model"],
      titleHints: [
        "model phat hien tam pin",
        "model phan loai sach ban",
        "camera va chuan hoa anh",
        "dependency hien tai",
      ],
    },
    {
      id: "workflow",
      lead: "Quy trình hoạt động của hệ thống:",
      keywords: ["quy trinh", "hoat dong", "van hanh", "luong xu ly", "cac buoc", "workflow"],
      titleHints: [
        "kien truc van hanh tong quat",
        "quy trinh van hanh de xuat",
        "chia patch va tinh ty le ban",
        "dieu kien quyet dinh ve sinh",
      ],
    },
    {
      id: "plc",
      lead: "Vai trò của PLC trong dự án:",
      keywords: ["plc", "siemens", "snap7", "dieu khien", "ve sinh", "trigger"],
      titleHints: ["dieu khien plc siemens s7", "dieu kien quyet dinh ve sinh"],
    },
    {
      id: "interfaces",
      lead: "Các giao diện và kênh giám sát:",
      keywords: ["web", "mobile", "desktop", "fastapi", "react native", "expo", "giao dien"],
      titleHints: [
        "giao dien desktop",
        "web monitor fastapi",
        "ung dung mobile react native / expo",
        "api chinh cho web/mobile",
      ],
    },
    {
      id: "strengths",
      lead: "Điểm mạnh nổi bật của dự án:",
      keywords: ["diem manh", "uu diem", "loi ich", "gia tri", "noi bat"],
      titleHints: ["diem manh cua du an", "muc tieu du an", "ket luan"],
    },
    {
      id: "limitations",
      lead: "Những giới hạn và điểm cần chú ý:",
      keywords: ["han che", "nhuoc diem", "rui ro", "luu y", "gioi han"],
      titleHints: ["han che va diem can chu y", "de xuat cai tien tiep theo"],
    },
  ];

  function normalizeText(value) {
    return String(value || "")
      .replace(/\u0110/g, "D")
      .replace(/\u0111/g, "d")
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .toLowerCase()
      .replace(/[`*_>#~|]/g, " ")
      .replace(/\s+/g, " ")
      .trim();
  }

  function cleanTitle(value) {
    return cleanMarkdown(value).replace(/^\d+\.\s*/, "").trim();
  }

  function tokenize(value) {
    return normalizeText(value)
      .split(/[^a-z0-9]+/i)
      .filter((token) => token.length > 1 && !STOP_WORDS.has(token));
  }

  function cleanMarkdown(value) {
    return String(value || "")
      .replace(/```[\s\S]*?```/g, " ")
      .replace(/!\[[^\]]*]\([^)]*\)/g, " ")
      .replace(/\[([^\]]+)\]\([^)]*\)/g, "$1")
      .replace(/`([^`]+)`/g, "$1")
      .replace(/^\s*>\s?/gm, "")
      .replace(/^\s*[-*+]\s+/gm, "- ")
      .replace(/\*\*/g, "")
      .replace(/__/g, "")
      .replace(/^#{1,6}\s+/gm, "")
      .replace(/^\|/gm, "")
      .replace(/\|\s*$/gm, "")
      .replace(/\r/g, "")
      .replace(/\n{3,}/g, "\n\n")
      .trim();
  }

  function splitSentences(text) {
    return String(text || "")
      .replace(/([.!?])\s+/g, "$1\n")
      .split(/\n+/)
      .map((item) => item.trim())
      .filter(Boolean);
  }

  function uniqueItems(items) {
    const seen = new Set();
    return items.filter((item) => {
      const key = normalizeText(item);
      if (!key || seen.has(key)) {
        return false;
      }

      seen.add(key);
      return true;
    });
  }

  function extractHighlights(section, limit = 3) {
    const bulletLines = section.text
      .split("\n")
      .map((line) => line.trim())
      .filter((line) => line.startsWith("- "))
      .map((line) => line.replace(/^- /, "").trim());

    if (bulletLines.length) {
      return uniqueItems(bulletLines).slice(0, limit);
    }

    return uniqueItems(splitSentences(section.text)).slice(0, limit);
  }

  function summarizeSection(section) {
    return extractHighlights(section, 3).join("\n");
  }

  function parseMarkdownSections(markdown) {
    const lines = String(markdown || "").replace(/\r/g, "").split("\n");
    const sections = [];
    let currentTitle = "Tong quan du an";
    let currentLines = [];

    function pushSection() {
      const text = cleanMarkdown(currentLines.join("\n"));

      if (!text) {
        currentLines = [];
        return;
      }

      const title = cleanTitle(currentTitle);
      const section = {
        title,
        rawTitle: cleanMarkdown(currentTitle),
        text,
      };

      section.normTitle = normalizeText(section.title);
      section.normText = normalizeText(section.text);
      section.tokens = tokenize(`${section.title} ${section.text}`);
      section.tokenSet = new Set(section.tokens);
      section.highlights = extractHighlights(section, 4);
      section.summary = summarizeSection(section);
      sections.push(section);
      currentLines = [];
    }

    lines.forEach((line) => {
      const headingMatch = line.match(/^(#{1,6})\s+(.+)$/);

      if (headingMatch) {
        pushSection();
        currentTitle = headingMatch[2].trim();
        return;
      }

      currentLines.push(line);
    });

    pushSection();
    return sections;
  }

  async function loadKnowledgeBase() {
    if (knowledgeState.ready || knowledgeState.loading) {
      return;
    }

    knowledgeState.loading = true;
    setStatus("Đang nạp tài liệu dự án...");
    updateControls();

    try {
      const response = await fetch("tai-lieu-du-an.md", { cache: "no-store" });

      if (!response.ok) {
        throw new Error(`Không đọc được tài liệu (${response.status})`);
      }

      const markdown = await response.text();
      knowledgeState.sections = parseMarkdownSections(markdown);
      knowledgeState.ready = knowledgeState.sections.length > 0;
      knowledgeState.error = knowledgeState.ready ? "" : "Tài liệu không có nội dung để tra cứu.";
      setStatus(
        knowledgeState.ready
          ? "Sẵn sàng trả lời từ tài liệu dự án trên website."
          : knowledgeState.error
      );
    } catch (error) {
      knowledgeState.error = error instanceof Error ? error.message : "Không thể nạp tài liệu dự án.";
      setStatus(knowledgeState.error);
    } finally {
      knowledgeState.loading = false;
      updateControls();
    }
  }

  function findTopicProfile(question, questionTokens) {
    const normalizedQuestion = normalizeText(question);
    let bestProfile = null;

    TOPIC_PROFILES.forEach((profile) => {
      let score = 0;

      profile.keywords.forEach((keyword) => {
        const normalizedKeyword = normalizeText(keyword);
        if (normalizedQuestion.includes(normalizedKeyword)) {
          score += normalizedKeyword.includes(" ") ? 4 : 2;
        }

        questionTokens.forEach((token) => {
          if (normalizedKeyword.split(" ").includes(token)) {
            score += 1;
          }
        });
      });

      if (!bestProfile || score > bestProfile.score) {
        bestProfile = { ...profile, score };
      }
    });

    return bestProfile && bestProfile.score > 0 ? bestProfile : null;
  }

  function scoreSection(section, query, queryTokens, profile) {
    let score = 0;
    const normalizedQuery = normalizeText(query);

    if (!normalizedQuery) {
      return 0;
    }

    if (section.normTitle.includes(normalizedQuery)) {
      score += 24;
    }

    if (section.normText.includes(normalizedQuery)) {
      score += 12;
    }

    queryTokens.forEach((token) => {
      if (section.normTitle.includes(token)) {
        score += 7;
      } else if (section.tokenSet.has(token)) {
        score += 4;
      } else if (section.normText.includes(token)) {
        score += 1;
      }
    });

    if (profile) {
      profile.titleHints.forEach((hint) => {
        const normalizedHint = normalizeText(hint);
        if (section.normTitle.includes(normalizedHint)) {
          score += 12;
        }
      });
    }

    return score;
  }

  function findBestSections(question, profile) {
    const queryTokens = tokenize(question);

    return knowledgeState.sections
      .map((section) => ({
        ...section,
        score: scoreSection(section, question, queryTokens, profile),
      }))
      .filter((section) => section.score > 0)
      .sort((left, right) => right.score - left.score)
      .slice(0, 3);
  }

  function buildGreetingAnswer() {
    return {
      text:
        "Chào bạn. Mình có thể giới thiệu nhanh về dự án Smart Solar Cleaning dựa trên tài liệu trong website.\n" +
        "Bạn có thể hỏi:\n" +
        "- Dự án này làm gì?\n" +
        "- Hệ thống dùng công nghệ nào?\n" +
        "- PLC đóng vai trò gì?\n" +
        "- Hệ thống hoạt động như thế nào?",
      sources: [],
    };
  }

  function buildFallbackAnswer() {
    return {
      text:
        "Mình chưa tìm thấy câu trả lời thật rõ trong tài liệu hiện có.\n" +
        "Bạn thử hỏi theo các chủ đề này nhé:\n" +
        "- Tổng quan và mục tiêu dự án\n" +
        "- Công nghệ AI, YOLO, EfficientNet-B0\n" +
        "- Vai trò của PLC Siemens S7\n" +
        "- Web monitor, desktop và mobile app\n" +
        "- Quy trình hoạt động và điều kiện vệ sinh",
      sources: [],
    };
  }

  function formatHighlights(profile, sections) {
    const lines = [];
    const lead = profile ? profile.lead : `Thông tin chính từ mục "${sections[0].title}":`;
    lines.push(lead);

    const mergedHighlights = uniqueItems(
      sections.flatMap((section) => section.highlights.map((item) => item.trim()))
    ).slice(0, 4);

    mergedHighlights.forEach((item) => {
      lines.push(`- ${item}`);
    });

    if (sections[1]) {
      lines.push(`\nBổ sung: xem thêm ở phần "${sections[1].title}".`);
    }

    return lines.join("\n");
  }

  function buildAnswer(question) {
    const normalizedQuestion = normalizeText(question);
    const questionTokens = tokenize(question);

    if (GREETING_PATTERNS.some((pattern) => normalizedQuestion.startsWith(pattern))) {
      return buildGreetingAnswer();
    }

    const profile = findTopicProfile(question, questionTokens);
    const matches = findBestSections(question, profile);

    if (!matches.length || matches[0].score < 4) {
      return buildFallbackAnswer();
    }

    const primary = matches[0];
    const secondary = matches[1] && matches[1].score >= primary.score * 0.6 ? matches[1] : null;
    const sectionsForAnswer = secondary ? [primary, secondary] : [primary];

    return {
      text: formatHighlights(profile, sectionsForAnswer),
      sources: sectionsForAnswer.map((item) => item.title),
    };
  }

  function scrollMessagesToBottom() {
    messagesNode.scrollTop = messagesNode.scrollHeight;
  }

  function setStatus(text) {
    statusNode.textContent = text;
  }

  function createSourcesNode(sources) {
    if (!sources.length) {
      return null;
    }

    const wrap = document.createElement("div");
    wrap.className = "chatbot-sources";

    sources.forEach((source) => {
      const item = document.createElement("span");
      item.className = "chatbot-source";
      item.textContent = source;
      wrap.appendChild(item);
    });

    return wrap;
  }

  function addMessage(role, text, sources = []) {
    const bubble = document.createElement("article");
    bubble.className = `chatbot-message ${role}`;

    if (role === "bot") {
      const label = document.createElement("strong");
      label.textContent = "Trợ lý";
      bubble.appendChild(label);
    }

    const textNode = document.createElement("div");
    textNode.textContent = text;
    bubble.appendChild(textNode);

    const sourcesNode = createSourcesNode(sources);
    if (sourcesNode) {
      bubble.appendChild(sourcesNode);
    }

    messagesNode.appendChild(bubble);
    scrollMessagesToBottom();
  }

  function updateControls() {
    const disabled = knowledgeState.loading;
    input.disabled = disabled;
    sendButton.disabled = disabled;
    suggestionsNode.querySelectorAll(".chatbot-chip").forEach((button) => {
      button.disabled = disabled;
    });
  }

  function togglePanel(open) {
    const shouldOpen = typeof open === "boolean" ? open : panel.hidden;
    panel.hidden = !shouldOpen;
    launcher.setAttribute("aria-expanded", String(shouldOpen));

    if (shouldOpen) {
      input.focus();
      loadKnowledgeBase();
    }
  }

  function answerQuestion(question) {
    const trimmed = String(question || "").trim();

    if (!trimmed) {
      return;
    }

    addMessage("user", trimmed);
    input.value = "";

    if (!knowledgeState.ready) {
      addMessage("bot", knowledgeState.error || "Tài liệu đang được nạp, bạn thử lại sau một chút nhé.");
      return;
    }

    setStatus("Đang tìm trong tài liệu dự án...");
    const answer = buildAnswer(trimmed);
    addMessage("bot", answer.text, answer.sources);
    setStatus("Sẵn sàng trả lời từ tài liệu dự án trên website.");
  }

  launcher.addEventListener("click", () => togglePanel());
  closeButton.addEventListener("click", () => togglePanel(false));

  form.addEventListener("submit", (event) => {
    event.preventDefault();
    answerQuestion(input.value);
  });

  input.addEventListener("keydown", (event) => {
    if (event.key === "Enter" && !event.shiftKey) {
      event.preventDefault();
      form.requestSubmit();
    }
  });

  suggestionsNode.querySelectorAll(".chatbot-chip").forEach((button) => {
    button.addEventListener("click", () => answerQuestion(button.textContent || ""));
  });

  addMessage(
    "bot",
    "Chào bạn. Mình là trợ lý giới thiệu dự án Smart Solar Cleaning. Mình sẽ trả lời dựa trên tài liệu đang có trong website."
  );

  updateControls();
}
