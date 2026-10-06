def twoSum(nums,target):
    seen = {}
    for i, num in enumerate(nums):
        complement = target - num
        if complement in seen :
            return [seen[complement], i]
        seen[num] = i
nums = [2,7,11,15]
target = int(input("Enter to the target value : "))
print(twoSum(nums,target))  # output = [0 ,1],target=9, ke liye [0,1] aayega 
