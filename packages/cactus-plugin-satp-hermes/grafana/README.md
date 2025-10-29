# Grafana / OTEL-LGTM Provisioning Guide

This repository defines the provisioning setup for **Grafana** as part of the **[OpenTelemetry LGTM](https://hub.docker.com/r/grafana/otel-lgtm) (Loki, Grafana, Tempo, Prometheus)** stack.  
Provisioning allows you to **automatically configure dashboards, alerting rules, and contact points** through YAML files — ensuring consistent, version-controlled observability configurations.

---

## Overview

Provisioning in Grafana means preloading configuration files that are applied automatically when Grafana starts.  
This setup covers three main provisioning categories:

1. **Dashboards** – Predefined visualizations for metrics, logs, and traces.
2. **Alerting Rules** – Conditions that trigger alerts based on metric or log thresholds.
3. **Contact Points** – Notification destinations for alert delivery (e.g., email, Discord, Slack).

All provisioning files are placed inside the docker image under the directory `/otel-lgtm/grafana/conf/provisioning/` (or equivalent custom mount path defined in the [`docker-compose-satp.yml`](../docker-compose-satp.yml)).

---

## Directory Structure

To provision the monitor system with dashboards, alerts or contact points use the following repository layout:

provisioning/<br>
├── dashboards/<br>
│ ├── [grafana-dashboards.yaml](#grafana-dashboardsyaml) &emsp;&emsp;&emsp;&nbsp;*# Dashboard provisioning configuration*<br>
│ ├── dashboard-#1.json &emsp;&emsp;&emsp;&emsp;&emsp;&emsp;*# Dashboard #1 definition*<br>
│ ├── ...<br>
│ └── [dashboard-#n.json](#dashboard-njson) &emsp;&emsp;&emsp;&emsp;&emsp;&emsp;*# Dashboard #n definition*<br>
├── alerting/<br>
│ ├── alert-#1.yaml &emsp;&emsp;&emsp;&emsp;&emsp;&emsp;&emsp;&emsp;&nbsp;*# Alert group and rule definitions #1*<br>
│ ├── ...<br>
│ ├── [alert-#m.yaml](#alert-myaml) &emsp;&emsp;&emsp;&emsp;&emsp;&emsp;&emsp;&emsp;*# Alert group and rule definitions #m*<br>
│ ├── contact-point-#1.yaml &emsp;&emsp;&emsp;&emsp;&nbsp;*# Contact point definitions #1*<br>
│ ├── ...<br>
│ └── [contact-point-#p.yaml](#contact-point-pyaml) &emsp;&emsp;&emsp;&emsp;&nbsp;*# Contact point definitions #p*<br>

### grafana-dashboards.yaml

This file contains the list of dashboards to be made available on start of the docker image. Each entry in the providers list defines a new dashboard.

### dashboard-#n.json

An example of a dashboard, that must be included in the [grafana-dashboards.yaml](#grafana-dashboardsyaml). Each dashboard is defined in a separate JSON file

Official documentation for dashboard provisioning available [here](https://grafana.com/docs/grafana/latest/administration/provisioning/#dashboards).

### alert-#m.yaml

An example of an alert. Alerts are defined in yaml files.

Official documentation for alert provisioning available [here](https://grafana.com/docs/grafana/latest/alerting/set-up/provision-alerting-resources/file-provisioning/#import-alert-rules).

### contact-point-#p.yaml

An example of a contact point. Contact points are defined in yaml files.

Official documentation for contact point provisioning available [here](https://grafana.com/docs/grafana/latest/alerting/set-up/provision-alerting-resources/file-provisioning/#import-contact-points).

## Usage Explanation

To customize the available dashboards, alerts and contact points, there are some files that require creation or modification. To create these elements there are 2 possible options:

- Read the [official documentation](https://grafana.com/docs/grafana/latest/) (less intuitive).
- Initiate the docker image, create the element and export it (more interactive).

In this explanation, we will provide a step-by-step tutorial on how to create a [dashboard](#dashboard-creation), an [alert rule](#alert-rule-creation) or a [contact point](#contact-point-creation) with the help of Grafana's built-in tools (the second option).

### Dashboard Creation

1. Go to the [`test file`](../src/test/typescript/integration/monitoring/functionality.test.ts) for monitoring and comment the lines that call the function `stopDockerComposeService`.

2. Run the test using `npx jest ./packages/cactus-plugin-satp-hermes/src/test/typescript/integration/monitoring/functionality.test.ts` from the project root.

*Note: This is done to make the metrics appear in Grafana, facilitating the process of creation.*

3. Login into Grafana using the following [link](http://localhost:3000/login) using `admin` as both *username* and *password*.

*Note: You might require to change the address in case it is not running on localhost.*

4. Access the Grafana dashboard endpoint using the following [link](http://localhost:3000/dashboards).

*Note: You might require to change the address in case it is not running on localhost.*

5. Click the `New` button and then the `New dashboard` button.

6. Click the `Add visualization` and select a data source for the data visualization.

7. Configure the panel with the desired data.

8. Click `Save dashboard`, name the dashboard and click `Save`.

9. If more panels are desired, click `Add` and then `Visualization`. Redo step 7 and 8.

10. After all panels are added, click `Exit edit` and then, `Export` followed by `Export as code`.

11. Click `Download file`, then move the file to the folder `grafana/provisioning/dashboards/` inside the package for the SATP-Hermes project.

12. On the file [grafana-dashboards.yaml](./provisioning/dashboards/grafana-dashboards.yaml), create a new entry by copying an existing example one and change the path to have the name of the new dashboard and change the property name of the dashboard itself.

13. Kill the running docker image for the container regarding otel-lgtm, rerun the test from step 2 and check if the dashboard is automatically provisioned.

14. Go to the [`test file`](../src/test/typescript/integration/monitoring/functionality.test.ts) for monitoring and uncomment the commented lines that call the function `stopDockerComposeService`.

### Contact Point Creation

*Note: This section appears before alert creation since alerts rely on the existence of established contact points.*

1. Access the Grafana dashboard endpoint using the following [link](http://localhost:3000/alerting/notifications).

*Note: You might require to change the address in case it is not running on localhost.*

2. Click the `Create contact point` button.

3. Browse the integration options, selecting the one that better suits the use case (eg. discord, email, etc.).

4. Fill the name of the contact point and the specific details of the integration option.

5. Click `Test` to assess the correct functioning of the contact point.

6. Click `Save contact point`.

7. Click `More` on the newly created contact point, followed by `Export`.

8. Click `Download`, then move the file to the folder `grafana/provisioning/alerting/` inside the package for the SATP-Hermes project.

### Alert Rule Creation

1. Go to the [`test file`](../src/test/typescript/integration/monitoring/functionality.test.ts) for monitoring and comment the lines that call the function `stopDockerComposeService`.

2. Run the test using `npx jest ./packages/cactus-plugin-satp-hermes/src/test/typescript/integration/monitoring/functionality.test.ts` from the project root.

*Note: This is done to make the metrics appear in Grafana, facilitating the process of creation.*

3. Access the Grafana dashboard endpoint using the following [link](http://localhost:3000/alerting/list).

*Note: You might require to change the address in case it is not running on localhost.*

4. Click the `New alert rule` button.

5. Fill in the name and select the metric to track.

6. Configure the threshold that should trigger the alarm.

7. Select the folder for your rule or click `New folder` to create a new one, giving it a name and clicking `Create`.

8. Select the evaluation group for your rule (periodicity of evaluation) or click `New evaluation group` to create a new one, giving it a name and an evaluation interval, and clicking `Create`.

9. Select the contact point (if none is defined, check its corresponding [section](#contact-point-creation)).

10. (Optional) Configure the notification message.

11. Click `Save`.

12. Click `More` on the newly created alert rule, followed by `Export` and `With modifications`.

13. Scroll down and click `Export`.

14. Click `Download`, then move the file to the folder `grafana/provisioning/alerting/` inside the package for the SATP-Hermes project.

15. Kill the running docker image for the container regarding otel-lgtm, rerun the test from step 2 and check if the alert is automatically provisioned.

16. Go to the [`test file`](../src/test/typescript/integration/monitoring/functionality.test.ts) for monitoring and uncomment the commented lines that call the function `stopDockerComposeService`.
