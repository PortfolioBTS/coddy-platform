import requests

ROUTER = "http://192.168.1.1"
LOGIN = "admin"
PASSWORD = "your_password"

session = requests.Session()

# 1. Авторизация
auth = session.post(
    f"{ROUTER}/auth",
    json={"login": LOGIN, "password": PASSWORD}
)

if auth.status_code != 200:
    print("Ошибка авторизации")
    exit()

# 2. Получение списка устройств (ARP таблица)
devices = session.get(f"{ROUTER}/rci/show/arp").json()

print("Подключённые устройства:\n")
for d in devices.get("arp", []):
    print(f"IP: {d.get('ip')}, MAC: {d.get('mac')}, Hostname: {d.get('hostname')}")
