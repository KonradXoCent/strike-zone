; Older installed hubs invoke the updater without /S. The explicit update
; action replaces the platform and restarts without another wizard.
!macro customInit
  ${if} ${isUpdated}
    SetSilent silent
  ${endif}
!macroend
