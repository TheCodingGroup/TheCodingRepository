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
