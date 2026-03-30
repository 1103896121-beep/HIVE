import paramiko
import sys
import os

# Server config
hostname = '103.91.219.230'
username = 'root'
password = 'cK.7+j%hRCW+}LeD'

def run_remote_cleanup():
    print(f"Connecting to production server {hostname}...")
    ssh = paramiko.SSHClient()
    ssh.set_missing_host_key_policy(paramiko.AutoAddPolicy())
    
    try:
        ssh.connect(
            hostname, 
            username=username, 
            password=password,
            timeout=15
        )
        
        # 1. 清空已处理订单
        # 2. 重置所有用户会员到期时间
        cleanup_sql = "DELETE FROM processed_transactions; UPDATE users SET subscription_end_at = NULL;"
        # 注意：这里的 HIVE_db 是根据文档描述的容器名
        cmd = f'docker exec HIVE_db psql -U postgres -d hivedb -c "{cleanup_sql}"'
        
        print(f"Executing cleanup command: {cmd}")
        stdin, stdout, stderr = ssh.exec_command(cmd)
        
        exit_status = stdout.channel.recv_exit_status()
        out = stdout.read().decode()
        err = stderr.read().decode()
        
        if out: print(f"STDOUT: {out}")
        if err: print(f"STDERR: {err}")
        
        if exit_status == 0:
            print("[SUCCESS] Production database cleaned successfully.")
        else:
            print(f"[FAILED] Cleanup failed with exit code {exit_status}")
            
    except Exception as e:
        print(f"[ERROR] Connection failed: {e}")
    finally:
        ssh.close()

if __name__ == "__main__":
    run_remote_cleanup()
