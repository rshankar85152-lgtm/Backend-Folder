import numpy as np
def b_search():
    s = np.array([11,22,33,44,66,77,88,99,110])
    tar=int(input("Enter any number to be searched  : "))
    b=0
    e=len(s)//2
    while b<=e:
        mid=(b+e)//2
        if s[mid]==tar:
            print("Element is found at given index",mid)
            return mid
        
        elif s[mid]<tar:
            b=mid+1
        else:
            e=mid-1
            print("Element not found")
b_search()




