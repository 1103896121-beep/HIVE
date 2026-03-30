import paramiko
import os

hostname = '103.91.219.230'
username = 'root'
password = 'cK.7+j%hRCW+}LeD'

# Files to sync
files_to_sync = [
    (r'e:\workrooten\Hive\backend\app\api\__init__.py', '/opt/hive_work/backend/app/api/__init__.py'),
    (r'e:\workrooten\Hive\backend\app\services\subscription.py', '/opt/hive_work/backend/app/services/subscription.py')
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
        
        print("Restarting backend container: hive_work-backend-1...")
        ssh.exec_command("docker restart hive_work-backend-1")
        
        print("[SUCCESS] Production backend updated and restarted.")
        
    except Exception as e:
        print(f"[ERROR] Syncing failed: {e}")
    finally:
        ssh.close()

if __name__ == "__main__":
    sync_and_restart()
