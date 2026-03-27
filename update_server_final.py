import paramiko
import sys

def update_server():
    try:
        ssh = paramiko.SSHClient()
        ssh.set_missing_host_key_policy(paramiko.AutoAddPolicy())
        ssh.connect('103.91.219.230', 22, 'root', password='cK.7+j%hRCW+}LeD', timeout=15)
        
        # 1. Update .env files
        commands = [
            "sed -i 's/^APPLE_SHARED_SECRET=.*/APPLE_SHARED_SECRET=63e3a31c98b147b89344d8caba4b321f/' /opt/hive_work/backend/.env",
            "sed -i 's/^APPLE_SHARED_SECRET=.*/APPLE_SHARED_SECRET=63e3a31c98b147b89344d8caba4b321f/' /opt/hive_work/.env",
            "if ! grep -q APPLE_SHARED_SECRET /opt/hive_work/backend/.env; then echo 'APPLE_SHARED_SECRET=63e3a31c98b147b89344d8caba4b321f' >> /opt/hive_work/backend/.env; fi",
            "if ! grep -q APPLE_SHARED_SECRET /opt/hive_work/.env; then echo 'APPLE_SHARED_SECRET=63e3a31c98b147b89344d8caba4b321f' >> /opt/hive_work/.env; fi",
        ]
        
        for cmd in commands:
            ssh.exec_command(cmd)
            
        # 2. Update docker-compose.yml explicitly to pass it as an environment variable
        # We find the 'backend:' section and insert 'APPLE_SHARED_SECRET: 63e3a31c98b147b89344d8caba4b321f' in the environment list
        # Using a safer python script ON THE SERVER to modify the YAML
        server_py = '''
import os
path = "/opt/hive_work/docker-compose.yml"
with open(path, "r") as f:
    lines = f.readlines()

new_lines = []
in_backend = False
in_env = False
added = False

for line in lines:
    if "backend:" in line: in_backend = True
    if in_backend and "environment:" in line: in_env = True
    
    new_lines.append(line)
    
    if in_env and not added and "- DATABASE_URL" in line:
        new_lines.append("      - APPLE_SHARED_SECRET=63e3a31c98b147b89344d8caba4b321f\\n")
        added = True
    
    if line.strip() == "" or (in_backend and line.startswith("  ") and not line.startswith("    ")):
        if not added and in_env:
            # Maybe it didn't have DATABASE_URL? Unlikely but safe
            pass
        # reset? No need just keep going
        pass

with open(path, "w") as f:
    f.writelines(new_lines)
'''
        # Send the file to server
        sftp = ssh.open_sftp()
        f = sftp.file('/tmp/update_yaml.py', 'w')
        f.write(server_py)
        f.close()
        
        # Run it
        ssh.exec_command('python3 /tmp/update_yaml.py')
        
        # 3. Restart backend
        stdin, stdout, stderr = ssh.exec_command('cd /opt/hive_work && docker-compose up -d --force-recreate backend')
        print(stdout.read().decode())
        print(stderr.read().decode())
        
        # 4. Final verification
        stdin, stdout, stderr = ssh.exec_command('docker ps -qf name=backend | xargs -I {} docker exec {} env | grep APPLE')
        print(f"VERIFICATION: {stdout.read().decode()}")

    except Exception as e:
        print(f"Error: {e}")
    finally:
        ssh.close()

if __name__ == '__main__':
    update_server()
