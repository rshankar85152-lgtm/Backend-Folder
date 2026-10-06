import os
import pandas as pd
data = {
    'Name' : ['Ravi','Sapna','Mukesh','Sajjan','Ajay'],
    'Address' : ['Duwra','Duwra','Duwra','Duwra','Bhelkha'],
    'Course' : ['B.Tech','B.A','B.Sc','B.A','B.A LLB'],
    'Age' : [18,18,18,17,18],
    'Contact' : [9369691164,9695569890,3265987845,3265894512,2659481256]

}
#created the data frame
df=pd.DataFrame(data)
#Save the excel file
df.to_excel("output.xlsx",index=False)
#Display
print("Successfull")
os.system('start output.xlsx')
