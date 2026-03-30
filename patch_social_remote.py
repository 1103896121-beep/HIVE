import paramiko
import os

hostname = '103.91.219.230'
username = 'root'
password = 'cK.7+j%hRCW+}LeD'
remote_path = '/opt/hive_work/backend/app/services/social.py'
local_path = r'e:\workrooten\Hive\backend\app\services\social.py'

def patch_remote():
    print(f"Connecting to {hostname}...")
    ssh = paramiko.SSHClient()
    ssh.set_missing_host_key_policy(paramiko.AutoAddPolicy())
    
    try:
        ssh.connect(hostname, username=username, password=password)
        sftp = ssh.open_sftp()
        
        print(f"Uploading corrected social.py to {remote_path}...")
        sftp.put(local_path, remote_path)
        sftp.close()
        
        print("Restarting backend container to apply changes...")
        # deploy.sh skips port check now, so we can just use it or do it manually
        ssh.exec_command("cd /opt/hive_work/backend && docker-compose -p hive restart backend")
        
        print("[SUCCESS] Production stats logic updated and backend restarted.")
        
    except Exception as e:
        print(f"[ERROR] Patching failed: {e}")
    finally:
        ssh.close()

if __name__ == "__main__":
    patch_remote()
