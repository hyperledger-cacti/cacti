import os
import os.path
import re
import subprocess
import json
import shutil

# Package openapi markdown for publishing as documentation
#
# - Copies any package openapi.json file in the dist directory to docs/docs/openapi/json 
# - Generates an openapi .md file to view the openapi.json file in docs/docs/openapi
# - Generates an index file of all openapi markdown files, grouped by base directory

apis_by_group = {}

doc_dir = "docs/docs/references/openapi"
json_dir = f"{doc_dir}/json"

def write_mdfile(component, src):
    mdfile_name = f"{doc_dir}/{component}_openapi.md"
    with open(mdfile_name, 'w') as f:
        f.write(f"<swagger-ui src=\"./{src}\"/>")
    return mdfile_name

def copy_openapi(component, openapi_file):
    new_filename = f"json/{component}-openapi.json"
    shutil.copy(openapi_file, f"{doc_dir}/{new_filename}")
    return new_filename

def publish_openapi(component, openapi_file):
    src_file = copy_openapi(component, openapi_file)
    md_file = write_mdfile(component, src_file)

def write_index(api_groups):
    with open(f"{doc_dir}/index.md", 'w') as f:
        f.write(f"---\n")
        f.write("title: All Cacti Open API Specifications\n")
        f.write("---\n")
        groups = list(api_groups.keys())
        groups.sort(reverse=True)
        for group in groups:
            components = api_groups[group]
            f.write(f"##{group.capitalize()}\n")
            components.sort()
            for component in components:
                f.write(f" * [{component}](./{component}_openapi.md)\n")

def get_openapi_files(root_dir):
    openapi_files = []
    for dirpath, dirnames, filenames in os.walk(root_dir + "/dist"):
        for filename in [f for f in filenames if f.endswith("openapi.json")]:
            openapi_files.append(os.path.join(dirpath, filename))
    return openapi_files


if not os.path.exists(json_dir):
    os.makedirs(json_dir)

package_list_str = subprocess.run(["npx lerna ls --json"], shell=True, capture_output=True, text=True)
package_list = json.loads(package_list_str.stdout)

for package in package_list:
    location_path = package['location'].split('/')
    root_dir = len(location_path) - location_path[::-1].index('cacti') # no rindex implemented
    package_group = location_path[root_dir]
    for openapi_file in get_openapi_files(package['location']):
        if not package_group in apis_by_group:
            apis_by_group[package_group] = []
        package_basename = re.sub(r'@.*\/', '', package['name'])
        publish_openapi(package_basename, openapi_file)
        print(f"{package_group} : {package_basename}")
        apis_by_group[package_group].append(package_basename)

write_index(apis_by_group)