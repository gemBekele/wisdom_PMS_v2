"""Generate .xlsx versions of all sample CSV templates."""
import csv, os, subprocess

def csv_to_xlsx(csv_path):
    xlsx_path = csv_path.replace('.csv', '.xlsx')
    # Use python3 with openpyxl if available, otherwise pandas
    code = f'''
import csv, openpyxl
wb = openpyxl.Workbook()
ws = wb.active
with open("{csv_path}", "r") as f:
    reader = csv.reader(f)
    for row in reader:
        ws.append(row)
wb.save("{xlsx_path}")
print(f"Created {{xlsx_path}}")
'''
    result = subprocess.run(['python3', '-c', code], capture_output=True, text=True)
    if result.returncode == 0:
        print(result.stdout.strip())
    else:
        # Fallback: try pandas
        code2 = f'''
import pandas as pd
df = pd.read_csv("{csv_path}")
df.to_excel("{xlsx_path}", index=False)
print(f"Created {{xlsx_path}}")
'''
        result2 = subprocess.run(['python3', '-c', code2], capture_output=True, text=True)
        if result2.returncode == 0:
            print(result2.stdout.strip())
        else:
            print(f"Failed: install openpyxl or pandas. Error: {result2.stderr[:200]}")

if __name__ == '__main__':
    templates_dir = os.path.dirname(os.path.abspath(__file__))
    for fname in os.listdir(templates_dir):
        if fname.endswith('.csv') and fname != 'sample_cbs_test.csv':
            csv_to_xlsx(os.path.join(templates_dir, fname))
