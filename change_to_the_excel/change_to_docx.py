import os
from tokenize import Name
import pandas as pd
data = {
    

}
# created the data frames
df=pd.DataFrame(data)
#crated the msword file
df.to_docx("Output.docx",index=False)
print("Successfull")
os.system('start output.docx')
