{{- define "fabric-cli.labels" }}
app.kubernetes.io/name: "{{ .Chart.Name }}-{{ $.Chart.Version | replace "+" "_" }}"
app.kubernetes.io/managed-by: "{{ .Release.Service }}"
app.kubernetes.io/instance: "{{ .Release.Name }}"
app.kubernetes.io/version: "{{ .Chart.AppVersion }}"
{{- end }}
