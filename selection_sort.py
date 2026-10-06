import numpy as np


def sel_sort(arr):
    n = len(arr)
    for i in range(n):
        min_idx = i
        for j in range(i + 1, n):
            if arr[j] < arr[min_idx]:
                min_idx = j
        # swap the foun minimum element with the first unsorted element
        arr[i], arr[min_idx] = arr[min_idx], arr[i]


data = [64, 25, 12, 22, 11, 89, 90, 48, 47, 46, 45, 0, 1, 2, 3, 4, 5, 56]
sel_sort(data)
print("Selection Sort")
print("Sorted array : ", data)
