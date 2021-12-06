import * as shell from "shelljs";

shell.cp("-R", "config/default.yaml", "/etc/cactus/");
shell.cp("-R", "config/usersetting.yaml", "/etc/cactus/");
