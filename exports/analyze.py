import cv2, numpy as np

def lapvar(path):
    img = cv2.imread(path, cv2.IMREAD_GRAYSCALE)
    return cv2.Laplacian(img, cv2.CV_64F).var(), img.shape

# Objective sharpness (variance of Laplacian) on matched 100% crops
for name, p in [("original crop", "exports/frames/orig_crop.png"),
                ("TestA crop", "exports/frames/testA_crop.png"),
                ("TestB crop(native px)", "exports/frames/testB_crop_native.png")]:
    v, shp = lapvar(p)
    print(f"{name:24s} sharpness(lapvar)={v:8.1f}  size={shp}")

# Build a side-by-side full-frame montage, all normalized to 1920 tall
def load_fit(path, h=1920):
    im = cv2.imread(path)
    scale = h/im.shape[0]
    return cv2.resize(im, (int(im.shape[1]*scale), h), interpolation=cv2.INTER_LANCZOS4)

imgs = [load_fit(p) for p in ["exports/frames/orig_full.png",
                              "exports/frames/testA_full.png",
                              "exports/frames/testB_full.png"]]
labels = ["ORIGINAL 1080x1920", "TEST A native", "TEST B upscaled 1440x2560"]
for im, lab in zip(imgs, labels):
    cv2.rectangle(im, (0,0), (im.shape[1],60), (0,0,0), -1)
    cv2.putText(im, lab, (12,42), cv2.FONT_HERSHEY_SIMPLEX, 1.0, (255,255,255), 2)
gap = np.full((1920,20,3), 255, np.uint8)
montage = np.hstack([imgs[0], gap, imgs[1], gap, imgs[2]])
cv2.imwrite("exports/frames/montage_full.png", montage)

# 100% crop montage (upscale small crops 2x for visibility)
def load_crop(path):
    im = cv2.imread(path)
    return cv2.resize(im, (im.shape[1]*2, im.shape[0]*2), interpolation=cv2.INTER_NEAREST)
crops = [load_crop(p) for p in ["exports/frames/orig_crop.png",
                                "exports/frames/testA_crop.png",
                                "exports/frames/testB_crop_native.png"]]
clabels = ["ORIGINAL 100%", "TEST A 100%", "TEST B 100%"]
for im, lab in zip(crops, clabels):
    cv2.rectangle(im, (0,0), (im.shape[1],44), (0,0,0), -1)
    cv2.putText(im, lab, (10,32), cv2.FONT_HERSHEY_SIMPLEX, 0.8, (255,255,255), 2)
cgap = np.full((crops[0].shape[0],16,3), 255, np.uint8)
cmont = np.hstack([crops[0], cgap, crops[1], cgap, crops[2]])
cv2.imwrite("exports/frames/montage_crop.png", cmont)
print("montages written")
