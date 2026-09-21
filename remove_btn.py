import os

path = os.path.join('paginas', 'panel-admin.html')
with open(path, 'r', encoding='utf-8') as f:
    lines = f.readlines()

new_lines = []
skip = 0
for line in lines:
    if skip > 0:
        skip -= 1
        continue
    if '<button id="theme-toggle-btn"' in line:
        skip = 2
        continue
    
    new_lines.append(line)

with open(path, 'w', encoding='utf-8') as f:
    f.writelines(new_lines)
print("Button removed")
