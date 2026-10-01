# ADR-0033 — Studio as a per-user macOS LaunchAgent
Status: accepted
Date: 2026-10-01

## Context

`npm run studio` runs only while its process survives. Dena wants Studio to
stay available and start automatically after restarting her Mac. Studio needs
the user's agent credentials, tmux environment and project files.

## Decision

Use macOS launchd with a per-user LaunchAgent named `com.dena.video-studio`,
installed in `~/Library/LaunchAgents/`. `RunAtLoad` starts Studio at login;
`KeepAlive` restarts an exited process, with a 10-second throttle.

Run the same `scripts/studio.mjs` entrypoint used by npm directly through an
absolute Node executable. Set the repository as `WorkingDirectory`, port 4777
and an explicit PATH for Node and the user's installed tools. Standard output
and error go to `~/Library/Logs/DenaStudio/`. Credentials remain in the existing
repository `.env` and client configuration, never in the plist.

The versioned [plist template](../../../config/studio-launchagent.plist) is
materialized with this machine's paths; the installed plist is user-local.
Operation and installation are defined in the [service runbook](../operations/studio-service.md)
and behavior in [RD-05-44–48](../requirements/rd-05-studio.md).

## Consequences

- No additional process manager or npm dependency is required.
- Studio survives Terminal closure and restarts after a process exit.
- Autostart happens after the user logs in, not before login. Sleep suspends
  availability; this decision does not change the Mac's power settings.
- Moving the repository or removing the pinned Node executable requires
  regenerating and reloading the plist.
- Studio detects Tailscale at startup. If Tailscale connects later, restart
  Studio to enable its existing Tailscale listener.
- Disable and unload the service before intentionally stopping it or running
  another Studio process on port 4777.
