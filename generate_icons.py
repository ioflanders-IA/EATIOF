import zlib, struct, os, math

def create_png(width, height, draw_func):
    img = bytearray(width * height * 4)
    
    for y in range(height):
        for x in range(width):
            r, g, b, a = draw_func(x, y, width, height)
            idx = (y * width + x) * 4
            img[idx] = int(r)
            img[idx+1] = int(g)
            img[idx+2] = int(b)
            img[idx+3] = int(a)
            
    raw_data = bytearray()
    for y in range(height):
        raw_data.append(0)
        raw_data.extend(img[y*width*4:(y+1)*width*4])
        
    compressed = zlib.compress(raw_data)
    
    def chunk(chunk_type, data):
        c = chunk_type + data
        crc = zlib.crc32(c) & 0xffffffff
        return struct.pack('>I', len(data)) + c + struct.pack('>I', crc)
        
    header = b'\x89PNG\r\n\x1a\n'
    ihdr = chunk(b'IHDR', struct.pack('>IIBBBBB', width, height, 8, 6, 0, 0, 0))
    idat = chunk(b'IDAT', compressed)
    iend = chunk(b'IEND', b'')
    
    return header + ihdr + idat + iend

def draw_eatiof_icon(x, y, w, h):
    # Normalized coords from -1 to 1
    nx = (x - w / 2) / (w / 2)
    ny = (y - h / 2) / (h / 2)
    
    # Base background: #191970 (Midnight Blue)
    r, g, b = 25, 25, 112
    
    # Distance from center
    dist = math.sqrt(nx*nx + ny*ny)
    
    # Rounded squircle container for emblem (radius ~ 0.75)
    # Squircle distance formula: (|x|^4 + |y|^4)^(1/4)
    sq_dist = (abs(nx)**3.5 + abs(ny)**3.5) ** (1/3.5)
    
    # Inner squircle (Vibrant Orange #f37021 = 243, 112, 33)
    if sq_dist < 0.78:
        r, g, b = 243, 112, 33
        
        # Plate outer ring (White)
        if 0.42 < dist < 0.48:
            r, g, b = 255, 255, 255
        # Plate inner area (Navy)
        elif dist <= 0.42:
            r, g, b = 25, 25, 112
            
            # Fork (Left)
            # Fork handle & tines
            if -0.25 < nx < -0.15 and -0.22 < ny < 0.22:
                # Tines gap
                if -0.22 < ny < -0.05 and abs(nx + 0.2) < 0.02:
                    r, g, b = 25, 25, 112
                else:
                    r, g, b = 255, 255, 255
            
            # Spoon / Knife (Right)
            if 0.15 < nx < 0.25 and -0.22 < ny < 0.22:
                if ny < -0.05:
                    if (nx - 0.2)**2 * 25 + (ny + 0.14)**2 * 45 < 0.2:
                        r, g, b = 255, 255, 255
                else:
                    if abs(nx - 0.2) < 0.025:
                        r, g, b = 255, 255, 255
            
            # Center Leaf (Emerald Green #10b981 = 16, 185, 129)
            # Leaf shape centered above plate center
            leaf_dx = nx
            leaf_dy = ny + 0.05
            if (leaf_dx - 0.05)**2 + (leaf_dy + 0.05)**2 < 0.035 and leaf_dx + leaf_dy < 0.02:
                r, g, b = 16, 185, 129

    return r, g, b, 255

os.makedirs('public', exist_ok=True)

with open('public/apple-touch-icon.png', 'wb') as f:
    f.write(create_png(180, 180, draw_eatiof_icon))

with open('public/pwa-192x192.png', 'wb') as f:
    f.write(create_png(192, 192, draw_eatiof_icon))

with open('public/pwa-512x512.png', 'wb') as f:
    f.write(create_png(512, 512, draw_eatiof_icon))

with open('public/favicon.png', 'wb') as f:
    f.write(create_png(64, 64, draw_eatiof_icon))

print("High quality icons generated successfully!")
