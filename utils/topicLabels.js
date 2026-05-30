const TOPIC_LABELS = {
  python: "Python",
  java: "Java",
  git: "Git",
  linux: "Linux",
  sql: "SQL",
  web: "Web",
  docker: "Docker",
  ai: "AI",
  markdown: "Markdown",
  regex: "正規表現",
  http: "HTTP",
  bash: "Bash",
  nginx: "nginx",
  errors: "エラー・トラブル集",
};

function getTopicLabel(topic) {
  if (!topic) return "";
  if (TOPIC_LABELS[topic]) return TOPIC_LABELS[topic];
  return topic.charAt(0).toUpperCase() + topic.slice(1);
}

module.exports = { TOPIC_LABELS, getTopicLabel };
