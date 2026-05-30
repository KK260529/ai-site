# Google Search Console データ

Search Console → **検索結果** → **エクスポート** で取得した JSON をこのフォルダに配置します。

## ファイル名

`performance.json` など `.json` 拡張子で保存。

## 形式

```json
[
  {
    "page": "https://example.com/article/slug",
    "query": "ModuleNotFoundError",
    "clicks": 12,
    "impressions": 340,
    "ctr": 0.035,
    "position": 8.2
  }
]
```

または `{ "rows": [ ... ] }` 形式でも可。

## API

管理認証後: `GET /api/seo/analytics`
