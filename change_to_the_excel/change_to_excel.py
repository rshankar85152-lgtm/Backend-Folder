import os
import pandas as pd
data = {
    'Name' : ['Payam','Sanjeet','Payal'],
    'Age' : [21,22,20],
    'Course' :['B.Tech','B.Tech','B.Tech']

}
#Created the data frame
df=pd.DataFrame(data)
#save the excel file
df.to_excel("output.xlsx",index=False)
#Display
print("Excel file successfully create ho gai")
# automatically open the file
os.system('start output.xlsx')