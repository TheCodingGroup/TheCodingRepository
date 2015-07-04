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
