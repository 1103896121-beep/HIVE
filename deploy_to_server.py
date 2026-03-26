import paramiko
import os
import sys

# Server config from MerchLens script
hostname = '103.91.219.230'
port = 22
username = 'root'
password = 'cK.7+j%hRCW+}LeD'
REMOTE_PROD_PATH = "/opt/hive_work"

LOCAL_TAR = r'hive_source.tar.gz'

def run_cmd(ssh, cmd):
    print(f"Executing: {cmd}")
    stdin, stdout, stderr = ssh.exec_command(cmd)
    
    # Live output reading
    exit_status = stdout.channel.recv_exit_status() # Blocking call
    out = stdout.read().decode()
    err = stderr.read().decode()
    
    if out: print(out)
    if err: print(f"ERR: {err}")
    
    if exit_status != 0:
        print(f"Command failed with exit code {exit_status}")
        sys.exit(exit_status)

def main():
    if not os.path.exists(LOCAL_TAR):
        print(f"Error: {LOCAL_TAR} not found. Please package first.")
        sys.exit(1)

    print("Connecting to server...")
    ssh = paramiko.SSHClient()
    ssh.set_missing_host_key_policy(paramiko.AutoAddPolicy())
    try:
        ssh.connect(
            hostname, 
            port, 
            username, 
            password=password, # Fallback for key passphrase
            look_for_keys=True,
            key_filename=[
                r'C:\Users\David\.ssh\id_rsa',
                r'C:\Users\David\.ssh\id_ed25519',
                r'C:\Users\David\.ssh\id_ed25519_merchlens'
            ],
            timeout=15
        )
        sftp = ssh.open_sftp()
        
        print(f"Uploading {LOCAL_TAR} to /root/{LOCAL_TAR}...")
        sftp.put(LOCAL_TAR, f'/root/{LOCAL_TAR}')
        sftp.close()

        print("Executing deployment commands on remote server...")
        deploy_cmd = f'''
        set -e
        echo "Creating target directory..."
        mkdir -p {REMOTE_PROD_PATH}

        echo "Extracting code to {REMOTE_PROD_PATH}..."
        tar -xzf /root/{LOCAL_TAR} -C {REMOTE_PROD_PATH}
        rm -f /root/{LOCAL_TAR}
        
        echo "Preparing environment file..."
        cd {REMOTE_PROD_PATH}/backend
        if [ ! -f .env ]; then
            echo "Copying .env.production.sample to .env"
            cp .env.production.sample .env
        fi
        
        echo "Executing HIVE deploy.sh..."
        chmod +x deploy.sh
        # Convert dos2unix just in case
        sed -i 's/\r$//' deploy.sh
        ./deploy.sh
        '''
        run_cmd(ssh, deploy_cmd)

    except Exception as e:
        import traceback
        print(f"Deployment failed: {e}")
        traceback.print_exc()
    finally:
        ssh.close()
        print("DEPLOY COMPLETE.")

if __name__ == "__main__":
    main()
