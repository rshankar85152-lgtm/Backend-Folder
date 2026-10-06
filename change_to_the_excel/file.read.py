import numpy as np
import time
import sys
s= range(1000)
print(sys.getsizeof(s)=len(s))
d=np.arange(1000)
print(type(d))
print(d.size*d.itemsize)
