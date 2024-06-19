import yaml

all_ci = {}

with open("./.github/workflows/ci.yaml") as stream:
    all_ci = yaml.safe_load(stream)

all_jobs = all_ci['jobs']

def find_similar_job(job_name, job):
    if not 'steps' in job:
        return None
    for compare_job_name, compare_job in all_jobs.items():
        if job_name == compare_job_name:
            return None
        if ('steps' in compare_job) and (job['steps'] == compare_job['steps']):
            return compare_job_name
    return None


for job_name, job in all_jobs.items():
    similar_job = find_similar_job(job_name, job)
    if similar_job:
        print(f"{job_name},{similar_job}")
    else:
        print(f"{job_name},UNIQUE")

