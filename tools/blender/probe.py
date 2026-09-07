import socket, json, sys, time
def call(cmd, params=None, timeout=120):
    s = socket.create_connection(("localhost", 9876), timeout=timeout)
    s.sendall(json.dumps({"type": cmd, "params": params or {}}).encode())
    buf = b""
    while True:
        chunk = s.recv(65536)
        if not chunk: break
        buf += chunk
        try: return json.loads(buf.decode())
        except Exception: continue
    return json.loads(buf.decode())
if __name__ == "__main__":
  for i in range(30):
    try:
        info = call("get_scene_info"); break
    except Exception as e:
        time.sleep(2); info = {"error": repr(e)}
  print(json.dumps(info, ensure_ascii=False)[:400])
