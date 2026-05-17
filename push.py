import subprocess
print("Adding files...")
subprocess.run(["git", "add", "-A"])
print("Committing...")
subprocess.run(["git", "commit", "-m", "fix: real SMTP connection test, credential storage, DB migration"])
print("Pushing...")
result = subprocess.run(["git", "push"])
if result.returncode == 0:
    print("Push successful!")
else:
    print("Push failed or nothing new to push.")
