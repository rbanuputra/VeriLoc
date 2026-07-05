{{/*
Label standar untuk tiap komponen.
Pakai: {{ include "geoface.labels" (dict "name" "api-gateway" "root" $) }}
*/}}
{{- define "geoface.labels" -}}
app.kubernetes.io/name: {{ .name }}
app.kubernetes.io/part-of: geoface
app.kubernetes.io/managed-by: {{ .root.Release.Service }}
helm.sh/chart: {{ .root.Chart.Name }}-{{ .root.Chart.Version }}
{{- end -}}

{{/*
Selector (subset label yang stabil, dipakai Deployment <-> Pod <-> Service).
*/}}
{{- define "geoface.selector" -}}
app.kubernetes.io/name: {{ .name }}
app.kubernetes.io/part-of: geoface
{{- end -}}

{{/*
Resolusi tag image: pakai tag per-service kalau diisi, kalau kosong ambil global.
Pakai: {{ include "geoface.imageTag" (dict "svc" .Values.apiGateway "root" $) }}
*/}}
{{- define "geoface.imageTag" -}}
{{- .svc.image.tag | default .root.Values.image.tag -}}
{{- end -}}
