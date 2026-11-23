#!/bin/zsh
cd -- "${0:A:h}" || exit 1
export PATH="/opt/homebrew/bin:/usr/local/bin:$PATH"

if ! command -v node >/dev/null; then
  print "Installe Node.js, puis ouvre ce fichier à nouveau."
  read -k 1 "?Appuie sur une touche pour fermer."
  exit 1
fi

active_root=$(/usr/bin/curl --fail --silent --max-time 1 http://127.0.0.1:8080/project-root)
if [[ "$active_root" == "$PWD" ]]; then
  /usr/bin/open http://localhost:8080/
  exit 0
fi

if /usr/bin/curl --silent --max-time 1 http://127.0.0.1:8080/ >/dev/null; then
  print "Un autre serveur utilise le port 8080. Arrête-le, puis réessaie."
  read -k 1 "?Appuie sur une touche pour fermer."
  exit 1
fi

node core/server.js &
server_pid=$!
trap 'kill "$server_pid" 2>/dev/null' EXIT
trap 'exit 130' INT
trap 'exit 143' TERM
trap 'exit 129' HUP

for attempt in {1..50}; do
  active_root=$(/usr/bin/curl --fail --silent --max-time 1 http://127.0.0.1:8080/project-root)
  if [[ "$active_root" == "$PWD" ]]; then
    /usr/bin/open http://localhost:8080/
    print "Le viewer est prêt. Garde cette fenêtre ouverte; tu peux la réduire."
    print "Pour arrêter le serveur, fais Ctrl+C ici."
    wait "$server_pid"
    exit $?
  fi
  if ! kill -0 "$server_pid" 2>/dev/null; then
    wait "$server_pid"
    exit 1
  fi
  sleep 0.1
done

print "Le serveur n'a pas démarré. Tu peux fermer cette fenêtre et réessayer."
exit 1
