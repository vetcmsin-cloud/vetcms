
import re

with open('client/src/components/document-designer/LabReportRenderer.tsx', 'r') as f:
    code = f.read()

code = re.sub(r'padding: \$\{settings\?\.labReportRowGap \|\| \\\'6\\\'\}px 8px', r'padding: ${settings?.labReportRowGap || \'6\'}px 8px', code)
code = re.sub(r'padding: \$\{settings\?\.labReportRowGap \|\| \\\'5\\\'\}px 8px', r'padding: ${settings?.labReportRowGap || \'5\'}px 8px', code)

with open('client/src/components/document-designer/LabReportRenderer.tsx', 'w') as f:
    f.write(code)

with open('client/src/components/invoice-designer/InvoiceSections.tsx', 'r') as f:
    code = f.read()

code = re.sub(r'padding: \$\{settings\?\.invoiceRowGap \|\| \'10\'\}px 6px', r'padding: ${settings?.invoiceRowGap || \'10\'}px 6px', code)

with open('client/src/components/invoice-designer/InvoiceSections.tsx', 'w') as f:
    f.write(code)

