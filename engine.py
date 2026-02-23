import sys
import os
import argparse
from rembg import remove, new_session
from PIL import Image, ImageFilter

parser = argparse.ArgumentParser()
# 'input' is for folder batch, 'file' is for single preview
parser.add_argument("--input", required=False) 
parser.add_argument("--file", required=False)  
parser.add_argument("--output", required=True)

parser.add_argument("--color", required=True)
parser.add_argument("--scale", type=float, required=True)
parser.add_argument("--width", type=int, required=True)
parser.add_argument("--height", type=int, required=True)
parser.add_argument("--erode", type=int, default=15)
parser.add_argument("--fg", type=int, default=220)
parser.add_argument("--bg", type=int, default=15)
parser.add_argument("--transparent", action="store_true")

args = parser.parse_args()

TARGET_SIZE = (args.width, args.height)
HEAD_SCALE = args.scale
rgb_values = [int(c) for c in args.color.split(',')]
SOLID_COLOR = tuple(rgb_values)

session = new_session("u2net_human_seg")

# --- DEFINE PROCESSING LOGIC ---
def process_single_image(img_path, save_path):
	try:
		inp_img = Image.open(img_path)
		
		# 1. Remove Background
		try:
			cutout = remove(
				inp_img, 
				session=session,
				alpha_matting=True,
				alpha_matting_foreground_threshold=args.fg,
				alpha_matting_background_threshold=args.bg, 
				alpha_matting_erode_size=args.erode, 
				post_process_mask=True
			)
		except Exception:
			cutout = remove(inp_img, session=session, alpha_matting=False, post_process_mask=True)
			mask = cutout.split()[-1].filter(ImageFilter.GaussianBlur(radius=1))
			cutout.putalpha(mask)

		# 2. Smart Crop (Ignore faint noise)
		alpha = cutout.split()[-1]
		bbox = alpha.point(lambda p: 255 if p > 10 else 0).getbbox()
		
		if bbox:
			person_img = cutout.crop(bbox)
			
			# 3. Smart Resize (Fit Inside)
			target_height = int(TARGET_SIZE[1] * HEAD_SCALE)
			aspect_ratio = person_img.width / person_img.height
			new_width = int(target_height * aspect_ratio)
			
			# CHECK: If width is too wide, scale down to fit width instead
			# FIX: The typo ">QA" has been removed below
			if new_width > TARGET_SIZE[0]:
				new_width = TARGET_SIZE[0]
				# Recalculate height to maintain aspect ratio
				target_height = int(new_width / aspect_ratio)

			person_img = person_img.resize((new_width, target_height), Image.Resampling.LANCZOS)
			
			# 4. Create Canvas
			if args.transparent:
				final_img = Image.new("RGBA", TARGET_SIZE, (0, 0, 0, 0))
			else:
				final_img = Image.new("RGBA", TARGET_SIZE, SOLID_COLOR)
			
			# Center Horizontally
			x_pos = (TARGET_SIZE[0] - new_width) // 2
			# Anchor to Bottom
			y_pos = TARGET_SIZE[1] - target_height
			
			final_img.paste(person_img, (x_pos, y_pos), person_img)
			
			if args.transparent or save_path.endswith('.png'):
				final_img.save(save_path, "PNG")
			else:
				final_img.convert("RGB").save(save_path, "JPEG", quality=95)
			return True
		return False
	except Exception as e:
		print(f"ERROR:{str(e)}", flush=True)
		return False

# --- MAIN EXECUTION ---
if args.file:
	# PREVIEW MODE
	process_single_image(args.file, args.output)
else:
	# BATCH MODE
	if not os.path.exists(args.output):
		os.makedirs(args.output)
	files = [f for f in os.listdir(args.input) if f.lower().endswith(('.jpg', '.jpeg', '.png'))]
	print(f"STARTING:{len(files)}", flush=True)
	
	for index, filename in enumerate(files):
		input_path = os.path.join(args.input, filename)
		ext = ".png" if args.transparent else ".jpg"
		output_path = os.path.join(args.output, filename.split('.')[0] + ext)
		process_single_image(input_path, output_path)
		print(f"PROGRESS:{index + 1}/{len(files)}", flush=True)

	print("DONE", flush=True)