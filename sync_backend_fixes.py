import paramiko
import os

hostname = '103.91.219.230'
username = 'root'
password = 'cK.7+j%hRCW+}LeD'

# Files to sync
files_to_sync = [
    (r'e:\workrooten\Hive\backend\app\api\__init__.py', '/opt/hive_work/backend/app/api/__init__.py'),
    (r'e:\workrooten\Hive\backend\app\services\subscription.py', '/opt/hive_work/backend/app/services/subscription.py'),
    (r'e:\workrooten\Hive\backend\app\services\social.py', '/opt/hive_work/backend/app/services/social.py'),
    (r'e:\workrooten\Hive\backend\app\core\config.py', '/opt/hive_work/backend/app/core/config.py'),
    (r'e:\workrooten\Hive\backend\app\core\email.py', '/opt/hive_work/backend/app/core/email.py')
]

def sync_and_restart():
    print(f"Connecting to {hostname}...")
    ssh = paramiko.SSHClient()
    ssh.set_missing_host_key_policy(paramiko.AutoAddPolicy())
    
    try:
        ssh.connect(hostname, username=username, password=password)
        sftp = ssh.open_sftp()
        
        for local, remote in files_to_sync:
            print(f"Uploading {local} to {remote}...")
            sftp.put(local, remote)
        
        sftp.close()
        
        print("Rebuilding backend container...")
        stdin, stdout, stderr = ssh.exec_command("cd /opt/hive_work && docker-compose up -d --build backend")
        print(stdout.read().decode())
        print(stderr.read().decode())
        
        print("[SUCCESS] Production backend updated and rebuilt.")
        
    except Exception as e:
        print(f"[ERROR] Syncing failed: {e}")
    finally:
        ssh.close()

if __name__ == "__main__":
    sync_and_restart()
