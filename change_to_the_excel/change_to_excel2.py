import os
import pandas as pd
data = {
    'Name' : ["Ravi","Karan","Munni Bai","Kiran Bedi","Rahul kumar"],
    'Course' : ["B.Tech","B.Tech","B.Tech","B.Tech","B.Tech"],
    'Subject 2nd Sem.' : ["DSTL","Maths (iv)","DSA","Human Value","Python Programming"],
    'Obtaing Marks' : [30,50,60,50,40]
}

#Created Data Frame
df = pd.DataFrame(data)

#save the excel file
df.to_excel("Output.xlsx",index=False)

#Display The File
print("Succefully run the file ")
os.system("start Output.xlsx")