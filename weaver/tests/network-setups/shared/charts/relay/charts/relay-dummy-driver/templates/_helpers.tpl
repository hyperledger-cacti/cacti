{{- define "relay-dummy-driver.labels" }}
relay.dlt-interop.org/role: "relay-dummy-driver"
relay.dlt-interop.org/network: "{{ $.Values.network.name }}"
relay.dlt-interop.org/name: "{{ $.Values.driver.name }}"
app.kubernetes.io/component: "Relay Dummy Driver"
app.kubernetes.io/name: "{{ .Chart.Name }}-{{ $.Chart.Version | replace "+" "_" }}"
app.kubernetes.io/managed-by: "{{ .Release.Service }}"
app.kubernetes.io/instance: "{{ .Release.Name }}"
app.kubernetes.io/version: "{{ .Chart.AppVersion }}"
{{- end }}