# 블렌더 렌더 스크립트 (MCP 소켓)

Blender 5.2 + blender-mcp 애드온(자동 시작, localhost:9876)이 켜진 상태에서 `python <스크립트>.py` 를 실행하면
`probe.py`의 `call("execute_code", {...})` 로 블렌더 안에서 파이썬을 돌려 렌더/내보내기를 한다. 산출물은 scratchpad/out_* 에 떨어지므로
사이트로 옮길 때는 트림·webp 변환을 거친다(math/assets/3d/render_assets.py, convert 절차 참고).

- `kart3d_props.py` → `kart3d/assets/props.glb` (로우폴리 소품 12종, 높이 1 → 게임에서 ×34~60)
- `card_arena_backgrounds.py` → `cards/art/bg/arena-castle.webp`, `arena-forest.webp` (1800×900 Cycles)
- `hub_covers.py` → `assets/covers/cover_{kart3d,kart,gem,stage}.webp` (1200×800)
- `math_badges.py` → `math/assets/3d/badges/<id>.png` (친구 22명 유광 구슬)
