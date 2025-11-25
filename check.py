import matplotlib.pyplot as plt
import matplotlib.image as mpimg

image_path = r"C:\Users\adity\OneDrive\Desktop\AccessAtlas\archive\vizwiz_data_ver1\data\Images\VizWiz_test_000000020004.jpg"

img = mpimg.imread(image_path)
plt.imshow(img)
plt.axis('off')
plt.title("Sample VizWiz Image")
plt.show()