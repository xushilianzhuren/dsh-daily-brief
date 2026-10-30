# dsh-daily-brief · 晨报台

One-screen **start-of-day brief**: what changed in the last 24h, open TODOs, latest ledger rows, and whether a handoff doc exists. Cold start without guessing.

## 工具 `daily_brief`
| 区块 | 内容 |
|---|---|
| ① 24h改动 | 工作区最近一天动过的文件（谁/别的会话干过什么） |
| ② 待办标记 | TODO/FIXME 扫描（md/js/ts/py/txt） |
| ③ 台账末行 | 各 .jsonl 台账最后记了什么 |
| ④ 交接档 | HANDOFF.md 在不在 |

只读，不写任何文件。常驻纪律：每天第一次接任务先跑简报再动手。

## 安装
```
dsh plugin add github:xushilianzhuren/dsh-daily-brief
```
MIT License.
