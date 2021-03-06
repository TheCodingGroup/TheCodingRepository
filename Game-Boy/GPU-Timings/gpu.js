GPU = {
    _canvas: {},
    _scrn: {},

    reset: function()
    {
        var c = document.getElementById('screen');
	if(c && c.getContext)
	{
	    GPU._canvas = c.getContext('2d');
	    if(GPU._canvas)
	    {
		if(GPU._canvas.createImageData)
		    GPU._scrn = GPU._canvas.createImageData(160, 144);

		else if(GPU._canvas.getImageData)
		    GPU._scrn = GPU._canvas.getImageData(0,0, 160,144);

		else
		    GPU._scrn = {
		        'width': 160,
			'height': 144,
			'data': new Array(160*144*4)
		    };

		// Initialise canvas to white
		for(var i=0; i<160*144*4; i++)
		    GPU._scrn.data[i] = 255;

		GPU._canvas.putImageData(GPU._scrn, 0, 0);
	    }
	}
    }
}
    _mode: 0,
    _modeclock: 0,
    _line: 0,

    step: function()
    {
        GPU._modeclock += Z80._r.t;

	switch(GPU._mode)
	{
	    // OAM read mode, scanline active
	    case 2:
	        if(GPU._modeclock >= 80)
		{
		    // Enter scanline mode 3
		    GPU._modeclock = 0;
		    GPU._mode = 3;
		}
		break;

	    // VRAM read mode, scanline active
	    // Treat end of mode 3 as end of scanline
	    case 3:
	        if(GPU._modeclock >= 172)
		{
		    // Enter hblank
		    GPU._modeclock = 0;
		    GPU._mode = 0;

		    // Write a scanline to the framebuffer
		    GPU.renderscan();
		}
		break;

	    // Hblank
	    // After the last hblank, push the screen data to canvas
	    case 0:
	        if(GPU._modeclock >= 204)
		{
		    GPU._modeclock = 0;
		    GPU._line++;

		    if(GPU._line == 143)
		    {
		        // Enter vblank
			GPU._mode = 1;
			GPU._canvas.putImageData(GPU._scrn, 0, 0);
		    }
		    else
		    {
		    	GPU._mode = 2;
		    }
		}
		break;

	    // Vblank (10 lines)
	    case 1:
	        if(GPU._modeclock >= 456)
		{
		    GPU._modeclock = 0;
		    GPU._line++;

		    if(GPU._line > 153)
		    {
		        // Restart scanning modes
			GPU._mode = 2;
			GPU._line = 0;
		    }
		}
		break;
	}
    }

    _tileset: [],

    reset: function()
    {
        // In addition to previous reset code:
	GPU._tileset = [];
	for(var i = 0; i < 384; i++)
	{
	    GPU._tileset[i] = [];
	    for(var j = 0; j < 8; j++)
	    {
	        GPU._tileset[i][j] = [0,0,0,0,0,0,0,0];
	    }
	}
    },

    // Takes a value written to VRAM, and updates the
    // internal tile data set
    updatetile: function(addr, val)
    {
        // Get the "base address" for this tile row
	addr &= 0x1FFE;

	// Work out which tile and row was updated
	var tile = (addr >> 4) & 511;
	var y = (addr >> 1) & 7;

	var sx;
	for(var x = 0; x < 8; x++)
	{
	    // Find bit index for this pixel
	    sx = 1 << (7-x);

	    // Update tile set
	    GPU._tileset[tile][y][x] =
	        ((GPU._vram[addr] & sx)   ? 1 : 0) +
	        ((GPU._vram[addr+1] & sx) ? 2 : 0);
	}
    }

    renderscan: function()
    {
	// VRAM offset for the tile map
	var mapoffs = GPU._bgmap ? 0x1C00 : 0x1800;

	// Which line of tiles to use in the map
	mapoffs += ((GPU._line + GPU._scy) & 255) >> 3;
	
	// Which tile to start with in the map line
	var lineoffs = (GPU._scx >> 3);

	// Which line of pixels to use in the tiles
	var y = (GPU._line + GPU._scy) & 7;

	// Where in the tileline to start
	var x = GPU._scx & 7;

        // Where to render on the canvas
	var canvasoffs = GPU._line * 160 * 4;

	// Read tile index from the background map
	var colour;
	var tile = GPU._vram[mapoffs + lineoffs];

	// If the tile data set in use is #1, the
	// indices are signed; calculate a real tile offset
	if(GPU._bgtile == 1 && tile < 128) tile += 256;

	for(var i = 0; i < 160; i++)
	{
	    // Re-map the tile pixel through the palette
	    colour = GPU._pal[GPU._tileset[tile][y][x]];

	    // Plot the pixel to canvas
	    GPU._scrn.data[canvasoffs+0] = colour[0];
	    GPU._scrn.data[canvasoffs+1] = colour[1];
	    GPU._scrn.data[canvasoffs+2] = colour[2];
	    GPU._scrn.data[canvasoffs+3] = colour[3];
	    canvasoffs += 4;

	    // When this tile ends, read another
	    x++;
	    if(x == 8)
	    {
		x = 0;
		lineoffs = (lineoffs + 1) & 31;
		tile = GPU._vram[mapoffs + lineoffs];
		if(GPU._bgtile == 1 && tile < 128) tile += 256;
	    }
	}
    }
    rb: function(addr)
    {
        switch(addr)
	{
	    // LCD Control
	    case 0xFF40:
	        return (GPU._switchbg  ? 0x01 : 0x00) |
		       (GPU._bgmap     ? 0x08 : 0x00) |
		       (GPU._bgtile    ? 0x10 : 0x00) |
		       (GPU._switchlcd ? 0x80 : 0x00);

	    // Scroll Y
	    case 0xFF42:
	        return GPU._scy;

	    // Scroll X
	    case 0xFF43:
	        return GPU._scx;

	    // Current scanline
	    case 0xFF44:
	        return GPU._line;
	}
    },

    wb: function(addr, val)
    {
        switch(addr)
	{
	    // LCD Control
	    case 0xFF40:
	        GPU._switchbg  = (val & 0x01) ? 1 : 0;
		GPU._bgmap     = (val & 0x08) ? 1 : 0;
		GPU._bgtile    = (val & 0x10) ? 1 : 0;
		GPU._switchlcd = (val & 0x80) ? 1 : 0;
		break;

	    // Scroll Y
	    case 0xFF42:
	        GPU._scy = val;
		break;

	    // Scroll X
	    case 0xFF43:
	        GPU._scx = val;
		break;

	    // Background palette
	    case 0xFF47:
	        for(var i = 0; i < 4; i++)
		{
		    switch((val >> (i * 2)) & 3)
		    {
		        case 0: GPU._pal[i] = [255,255,255,255]; break;
			case 1: GPU._pal[i] = [192,192,192,255]; break;
			case 2: GPU._pal[i] = [ 96, 96, 96,255]; break;
			case 3: GPU._pal[i] = [  0,  0,  0,255]; break;
		    }
		}
		break;
	}
    }
    _oam: [],
    _objdata: [],

    reset: function()
    {
        // In addition to previous reset code:
	for(var i=0, n=0; i < 40; i++, n+=4)
	{
	    GPU._oam[n + 0] = 0;
	    GPU._oam[n + 1] = 0;
	    GPU._oam[n + 2] = 0;
	    GPU._oam[n + 3] = 0;
	    GPU._objdata[i] = {
	        'y': -16, 'x': -8,
		'tile': 0, 'palette': 0,
		'xflip': 0, 'yflip': 0, 'prio': 0, 'num': i
	    };
	}
    },

    buildobjdata: function(addr, val)
    {
	var obj = addr >> 2;
	if(obj < 40)
	{
	    switch(addr & 3)
	    {
	        // Y-coordinate
	        case 0: GPU._objdata[obj].y = val-16; break;
		
		// X-coordinate
		case 1: GPU._objdata[obj].x = val-8; break;

		// Data tile
		case 2: GPU._objdata[obj].tile = val; break;

		// Options
		case 3:
		    GPU._objdata[obj].palette = (val & 0x10) ? 1 : 0;
		    GPU._objdata[obj].xflip   = (val & 0x20) ? 1 : 0;
		    GPU._objdata[obj].yflip   = (val & 0x40) ? 1 : 0;
		    GPU._objdata[obj].prio    = (val & 0x80) ? 1 : 0;
		    break;
	    }
	}
    }
    _pal: {
        bg: [],
	obj0: [],
	obj1: []
    },

    wb: function(addr)
    {
        switch(addr)
	{
	    // ...
	    // Background palette
	    case 0xFF47:
	        for(var i = 0; i < 4; i++)
		{
		    switch((val >> (i * 2)) & 3)
		    {
		        case 0: GPU._pal.bg[i] = [255,255,255,255]; break;
			case 1: GPU._pal.bg[i] = [192,192,192,255]; break;
			case 2: GPU._pal.bg[i] = [ 96, 96, 96,255]; break;
			case 3: GPU._pal.bg[i] = [  0,  0,  0,255]; break;
		    }
		}
		break;

	    // Object palettes
	    case 0xFF48:
	        for(var i = 0; i < 4; i++)
		{
		    switch((val >> (i * 2)) & 3)
		    {
		        case 0: GPU._pal.obj0[i] = [255,255,255,255]; break;
			case 1: GPU._pal.obj0[i] = [192,192,192,255]; break;
			case 2: GPU._pal.obj0[i] = [ 96, 96, 96,255]; break;
			case 3: GPU._pal.obj0[i] = [  0,  0,  0,255]; break;
		    }
		}
		break;

	    case 0xFF49:
	        for(var i = 0; i < 4; i++)
		{
		    switch((val >> (i * 2)) & 3)
		    {
		        case 0: GPU._pal.obj1[i] = [255,255,255,255]; break;
			case 1: GPU._pal.obj1[i] = [192,192,192,255]; break;
			case 2: GPU._pal.obj1[i] = [ 96, 96, 96,255]; break;
			case 3: GPU._pal.obj1[i] = [  0,  0,  0,255]; break;
		    }
		}
		break;
	}
    }
    renderscan: function()
    {
        // Scanline data, for use by sprite renderer
	var scanrow = [];

        // Render background if it's switched on
        if(GPU._switchbg)
	{
	    var mapoffs = GPU._bgmap ? 0x1C00 : 0x1800;
	    mapoffs += ((GPU._line + GPU._scy) & 255) >> 3;
	    var lineoffs = (GPU._scx >> 3);
	    var y = (GPU._line + GPU._scy) & 7;
	    var x = GPU._scx & 7;
	    var canvasoffs = GPU._line * 160 * 4;
	    var colour;
	    var tile = GPU._vram[mapoffs + lineoffs];

	    // If the tile data set in use is #1, the
	    // indices are signed; calculate a real tile offset
	    if(GPU._bgtile == 1 && tile < 128) tile += 256;

	    for(var i = 0; i < 160; i++)
	    {
	        // Re-map the tile pixel through the palette
	        colour = GPU._pal.bg[GPU._tileset[tile][y][x]];

	        // Plot the pixel to canvas
	        GPU._scrn.data[canvasoffs+0] = colour[0];
	        GPU._scrn.data[canvasoffs+1] = colour[1];
	        GPU._scrn.data[canvasoffs+2] = colour[2];
	        GPU._scrn.data[canvasoffs+3] = colour[3];
	        canvasoffs += 4;

		// Store the pixel for later checking
		scanrow[i] = GPU._tileset[tile][y][x];

	        // When this tile ends, read another
	        x++;
	        if(x == 8)
	        {
	    	    x = 0;
	    	    lineoffs = (lineoffs + 1) & 31;
	    	    tile = GPU._vram[mapoffs + lineoffs];
	    	    if(GPU._bgtile == 1 && tile < 128) tile += 256;
	        }
	    }
	}

	// Render sprites if they're switched on
	if(GPU._switchobj)
	{
	    for(var i = 0; i < 40; i++)
	    {
	        var obj = GPU._objdata[i];

		// Check if this sprite falls on this scanline
		if(obj.y <= GPU._line && (obj.y + 8) > GPU._line)
		{
		    // Palette to use for this sprite
		    var pal = obj.pal ? GPU._pal.obj1 : GPU._pal.obj0;

        	    // Where to render on the canvas
		    var canvasoffs = (GPU._line * 160 + obj.x) * 4;

		    // Data for this line of the sprite
		    var tilerow;

		    // If the sprite is Y-flipped,
		    // use the opposite side of the tile
		    if(obj.yflip)
		    {
		        tilerow = GPU._tileset[obj.tile]
			                      [7 - (GPU._line - obj.y)];
		    }
		    else
		    {
		        tilerow = GPU._tileset[obj.tile]
			                      [GPU._line - obj.y];
		    }

		    var colour;
		    var x;

		    for(var x = 0; x < 8; x++)
		    {
		        // If this pixel is still on-screen, AND
			// if it's not colour 0 (transparent), AND
			// if this sprite has priority OR shows under the bg
			// then render the pixel
			if((obj.x + x) >= 0 && (obj.x + x) < 160 &&
			   tilerow[x] &&
			   (obj.prio || !scanrow[obj.x + x]))
			{
		            // If the sprite is X-flipped,
			    // write pixels in reverse order
			    colour = pal[tilerow[obj.xflip ? (7-x) : x]];

			    GPU._scrn.data[canvasoffs+0] = colour[0];
			    GPU._scrn.data[canvasoffs+1] = colour[1];
			    GPU._scrn.data[canvasoffs+2] = colour[2];
			    GPU._scrn.data[canvasoffs+3] = colour[3];

			    canvasoffs += 4;
			}
		    }
		}
	    }
	}
    },
    
    rb: function(addr)
    {
        switch(addr)
	{
	    // LCD Control
	    case 0xFF40:
	        return (GPU._switchbg  ? 0x01 : 0x00) |
		       (GPU._switchobj ? 0x02 : 0x00) |
		       (GPU._bgmap     ? 0x08 : 0x00) |
		       (GPU._bgtile    ? 0x10 : 0x00) |
		       (GPU._switchlcd ? 0x80 : 0x00);

	    // ...
	}
    },

    wb: function(addr, val)
    {
        switch(addr)
	{
	    // LCD Control
	    case 0xFF40:
	        GPU._switchbg  = (val & 0x01) ? 1 : 0;
		GPU._switchobj = (val & 0x02) ? 1 : 0;
		GPU._bgmap     = (val & 0x08) ? 1 : 0;
		GPU._bgtile    = (val & 0x10) ? 1 : 0;
		GPU._switchlcd = (val & 0x80) ? 1 : 0;
		break;

	    // ...
	}
    }
