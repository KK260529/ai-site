const { getClient, parseJsonResponse, toUserError } = require("../groq");
const { config } = require("../config");
const knowledgeStore = require("../stores/knowledgeStore");

const COURSE_SYSTEM_PROMPT = `あなたは「個人用AI知識出版社」のカリキュラム設計者です。
指定トピックの講座構成を、初心者向けの学習順で設計します。

## ルール
- エピソードは指定数ちょうど
- slug は英小文字・ハイフンのみ（例: java-install）
- 学習順が自然（基礎→応用）
- 各回タイトルは具体的で短く
- ロードマップの beginnerPath はエピソード slug の順序配列

## 出力（JSONのみ）
{
  "course": {
    "courseId": "english-kebab-id",
    "title": "講座タイトル",
    "description": "講座説明（80〜150字）",
    "target": "対象者",
    "episodes": [
      { "episode": 1, "slug": "slug-1", "title": "第1回タイトル" }
    ]
  },
  "roadmap": {
    "title": "トピック学習ロードマップタイトル",
    "beginnerPath": ["slug-1", "slug-2"]
  },
  "glossaryAdditions": {
    "用語キー": {
      "definition": "定義",
      "aliases": ["別名"],
      "related": ["関連用語"]
    }
  }
}`;

function validateCoursePayload(data, episodeCount) {
  if (!data?.course) throw new Error("AI応答に course がありません");
  const { course } = data;
  if (!course.courseId || !course.title) {
    throw new Error("courseId と title が必要です");
  }
  if (!Array.isArray(course.episodes) || course.episodes.length !== episodeCount) {
    throw new Error(`エピソードは ${episodeCount} 件である必要があります`);
  }
}

async function generateCourseStructure({
  topic,
  title,
  target,
  episodeCount,
  courseId,
  description,
}) {
  const client = getClient();
  if (!client) {
    throw new Error("Groq API キーが未設定です。.env を確認しサーバーを再起動してください。");
  }

  const roadmap = knowledgeStore.getRoadmap(topic);
  const glossary = knowledgeStore.getGlossary(topic);
  const existingCourses = knowledgeStore.listCourses(topic).map((c) => c.courseId);

  const userPrompt = `## トピック
${topic}

## 講座タイトル
${title}

## 対象者
${target || "初心者"}

## エピソード数
${episodeCount}

## 講座ID（指定があれば使用、なければ生成）
${courseId || "（titleから適切な kebab-case を生成）"}

## 講座説明ヒント
${description || "（なし）"}

## 既存講座ID（重複禁止）
${existingCourses.join(", ") || "なし"}

## 既存ロードマップ
${JSON.stringify(roadmap, null, 2)}

## 既存用語（参考）
${Object.keys(glossary).slice(0, 20).join(", ") || "なし"}

上記に基づき講座構成を設計してください。course.topic は "${topic}" としてください。`;

  try {
    const completion = await client.chat.completions.create({
      model: config.groqModel,
      temperature: 0.5,
      max_tokens: 4096,
      response_format: { type: "json_object" },
      messages: [
        { role: "system", content: COURSE_SYSTEM_PROMPT },
        { role: "user", content: userPrompt },
      ],
    });

    const raw = completion.choices[0]?.message?.content;
    if (!raw) throw new Error("AIからの応答が空でした");

    const parsed = parseJsonResponse(raw);
    validateCoursePayload(parsed, episodeCount);

    const finalCourseId = (courseId || parsed.course.courseId || "").toLowerCase();
    if (knowledgeStore.getCourse(topic, finalCourseId)) {
      throw new Error(`講座ID「${finalCourseId}」は既に存在します`);
    }

    const course = {
      ...parsed.course,
      courseId: finalCourseId,
      topic,
      episodes: knowledgeStore.renumberEpisodes(parsed.course.episodes),
    };

    knowledgeStore.saveCourse(topic, course);

    if (parsed.roadmap) {
      const current = knowledgeStore.getRoadmap(topic);
      knowledgeStore.saveRoadmap(topic, {
        ...current,
        title: parsed.roadmap.title || current.title,
        beginnerPath: parsed.roadmap.beginnerPath || course.episodes.map((e) => e.slug),
      });
    } else {
      knowledgeStore.mergeRoadmapPath(
        topic,
        course.episodes.map((e) => e.slug)
      );
    }

    if (parsed.glossaryAdditions) {
      knowledgeStore.mergeGlossary(topic, parsed.glossaryAdditions);
    }

    return { course, raw, parsed };
  } catch (err) {
    throw toUserError(err);
  }
}

module.exports = { generateCourseStructure, COURSE_SYSTEM_PROMPT };
