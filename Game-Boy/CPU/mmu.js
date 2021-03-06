MMU = {
    rb: function(addr) { /* Read 8-bit byte from a given address */ },
    rw: function(addr) { /* Read 16-bit word from a given address */ },

    wb: function(addr, val) { /* Write 8-bit byte to a given address */ },
    ww: function(addr, val) { /* Write 16-bit word to a given address */ }
};
MMU = {
    // Flag indicating BIOS is mapped in
    // BIOS is unmapped with the first instruction above 0x00FF
    _inbios: 1,

    // Memory regions (initialised at reset time)
    _bios: [],
    _rom: [],
    _wram: [],
    _eram: [],
    _zram: [],

    // Read a byte from memory
    rb: function(addr)
    {
	switch(addr & 0xF000)
	{
	    // BIOS (256b)/ROM0
	    case 0x0000:
	        if(MMU._inbios)
		{
		    if(addr < 0x0100)
		        return MMU._bios[addr];
		    else if(Z80._r.pc == 0x0100)
		        MMU._inbios = 0;
		}

		return MMU._rom[addr];
MMU.load = function(file)
{
    var b = new BinFileReader(file);
    MMU._rom = b.readString(b.getFileSize(), 0);
};

	    // ROM0
	    case 0x1000:
	    case 0x2000:
	    case 0x3000:
	        return MMU._rom[addr];

	    // ROM1 (unbanked) (16k)
	    case 0x4000:
	    case 0x5000:
	    case 0x6000:
	    case 0x7000:
	        return MMU._rom[addr];

	    // Graphics: VRAM (8k)
	    case 0x8000:
	    case 0x9000:
	        return GPU._vram[addr & 0x1FFF];

	    // External RAM (8k)
	    case 0xA000:
	    case 0xB000:
	        return MMU._eram[addr & 0x1FFF];

	    // Working RAM (8k)
	    case 0xC000:
	    case 0xD000:
	        return MMU._wram[addr & 0x1FFF];

	    // Working RAM shadow
	    case 0xE000:
	        return MMU._wram[addr & 0x1FFF];

	    // Working RAM shadow, I/O, Zero-page RAM
	    case 0xF000:
	        switch(addr & 0x0F00)
		{
		    // Working RAM shadow
		    case 0x000: case 0x100: case 0x200: case 0x300:
		    case 0x400: case 0x500: case 0x600: case 0x700:
		    case 0x800: case 0x900: case 0xA00: case 0xB00:
		    case 0xC00: case 0xD00:
		        return MMU._wram[addr & 0x1FFF];

		    // Graphics: object attribute memory
		    // OAM is 160 bytes, remaining bytes read as 0
		    case 0xE00:
		        if(addr < 0xFEA0)
			    return GPU._oam[addr & 0xFF];
			else
			    return 0;

		    // Zero-page
		    case 0xF00:
		        if(addr >= 0xFF80)
			{
			    return MMU._zram[addr & 0x7F];
			}
			else
			{
			    // I/O control handling
			    // Currently unhandled
			    return 0;
			}
		}
	}
    },

    Read a 16-bit word
    rw: function(addr)
    {
        return MMU.rb(addr) + (MMU.rb(addr+1) << 8);
    }
};
MMU.load = function(file)
{
    var b = new BinFileReader(file);
    MMU._rom = b.readString(b.getFileSize(), 0);
};

	    case 0x1000:
	    case 0x2000:
	    case 0x3000:
	        return MMU._rom.charCodeAt(addr);
    wb: function(addr, val)
    {
        switch(addr & 0xF000)
	{
            // Only the VRAM case is shown:
	    case 0x8000:
	    case 0x9000:
		GPU._vram[addr & 0x1FFF] = val;
		GPU.updatetile(addr, val);
		break;
	}
    }
    rb: function(addr)
    {
	switch(addr & 0xF000)
	{
	    ...
	    case 0xF000:
	        switch(addr & 0x0F00)
		{
		    ...
		    // Zero-page
		    case 0xF00:
		        if(addr >= 0xFF80)
			{
			    return MMU._zram[addr & 0x7F];
			}
			else
			{
			    // I/O control handling
			    switch(addr & 0x00F0)
			    {
			        // GPU (64 registers)
			        case 0x40: case 0x50: case 0x60: case 0x70:
				    return GPU.rb(addr);
			    }
			    return 0;
			}
		}
	}
    },

    wb: function(addr, val)
    {
	switch(addr & 0xF000)
	{
	    ...
	    case 0xF000:
	        switch(addr & 0x0F00)
		{
		    ...
		    // Zero-page
		    case 0xF00:
		        if(addr >= 0xFF80)
			{
			    MMU._zram[addr & 0x7F] = val;
			}
			else
			{
			    // I/O
			    switch(addr & 0x00F0)
			    {
			        // GPU
			        case 0x40: case 0x50: case 0x60: case 0x70:
				    GPU.wb(addr, val);
				    break;
			    }
			}
			break;
		}
		break;
	}
    } 

    rb: function(addr)
    {
	switch(addr & 0xF000)
	{
	    ...
	    case 0xF000:
	        switch(addr & 0x0F00)
		{
		    ...
		    // Zero-page
		    case 0xF00:
		        if(addr >= 0xFF80)
			{
			    return MMU._zram[addr & 0x7F];
			}
			else if(addr >= 0xFF40)
			{
			    // GPU (64 registers)
			    return GPU.rb(addr);
			}
			else switch(addr & 0x3F)
			{
			    case 0x00: return KEY.rb();
			    default: return 0;
			}
		}
	}
    }

    rb: function(addr)
    {
	switch(addr & 0xF000)
	{
	    ...
	    case 0xF000:
	        switch(addr & 0x0F00)
		{
		    ...
		    // OAM
		    case 0xE00:
		        return (addr < 0xFEA0) ? GPU._oam[addr & 0xFF] : 0;
		}
	}
    },

    wb: function(addr)
    {
	switch(addr & 0xF000)
	{
	    ...
	    case 0xF000:
	        switch(addr & 0x0F00)
		{
		    ...
		    // OAM
		    case 0xE00:
		        if(addr < 0xFEA0) GPU._oam[addr & 0xFF] = val;
			GPU.buildobjdata(addr - 0xFE00, val);
			break;
		}
	}
    }
MMU = {
    _ie: 0,
    _if: 0,

    rb: function(addr)
    {
	switch(addr & 0xF000)
	{
	    ...
	    case 0xF000:
	        switch(addr & 0x0F00)
		{
		    ...
		    // Zero-page
		    case 0xF00:
		    	if(addr == 0xFFFF)
			{
			    return MMU._ie;
			}
		        else if(addr >= 0xFF80)
			{
			    return MMU._zram[addr & 0x7F];
			}
			else
			{
			    // I/O control handling
			    switch(addr & 0x00F0)
			    {
			    	case 0x00:
				    if(addr == 0xFF0F) return MMU._if;
				    break;
			    	...
			    }
			    return 0;
			}
		}
	}
    },
    ...
};
MMU = {
    // MBC states
    _mbc: [],

    // Offset for second ROM bank
    _romoffs: 0x4000,

    // Offset for RAM bank
    _ramoffs: 0x0000,

    // Copy of the ROM's cartridge-type value
    _carttype: 0,

    reset: function()
    {
        ...

	// In addition to previous reset code,
	// initialise MBC internal data
	MMU._mbc[0] = {};
	MMU._mbc[1] = {
	    rombank: 0,		// Selected ROM bank
	    rambank: 0,		// Selected RAM bank
	    ramon: 0,		// RAM enable switch
	    mode: 0		// ROM/RAM expansion mode
	};

	MMU._romoffs = 0x4000;
	MMU._ramoffs = 0x0000;
    },

    load: function(file)
    {
        ...
	MMU._carttype = MMU._rom.charCodeAt(0x0147);
    }
}
MMU = {
    rb: function(addr)
    {
    	switch(addr & 0xF000)
	{
	    ...

	    // ROM (switched bank)
	    case 0x4000:
	    case 0x5000:
	    case 0x6000:
	    case 0x7000:
	        return MMU._rom.charCodeAt(MMU._romoffs +
		                           (addr & 0x3FFF));

	    // External RAM
	    case 0xA000:
	    case 0xB000:
	        return MMU._eram[MMU._ramoffs +
		                 (addr & 0x1FFF)];
	}
    }
};
    wb: function(addr, val)
    {
        switch(addr & 0xF000)
	{
	    // MBC1: External RAM switch
	    case 0x0000:
	    case 0x1000:
	        switch(MMU._carttype)
		{
		    case 2:
		    case 3:
			MMU._mbc[1].ramon =
			    ((val & 0x0F) == 0x0A) ? 1 : 0;
			break;
		}
		break;

	    // MBC1: ROM bank
	    case 0x2000:
	    case 0x3000:
	        switch(MMU._carttype)
		{
		    case 1:
		    case 2:
		    case 3:
		        // Set lower 5 bits of ROM bank (skipping #0)
			val &= 0x1F;
			if(!val) val = 1;
			MMU._mbc[1].rombank =
			    (MMU._mbc[1].rombank & 0x60) + val;

			// Calculate ROM offset from bank
			MMU._romoffs = MMU._mbc[1].rombank * 0x4000;
			break;
		}
		break;

	    // MBC1: RAM bank
	    case 0x4000:
	    case 0x5000:
	        switch(MMU._carttype)
		{
		    case 1:
		    case 2:
		    case 3:
		    	if(MMU._mbc[1].mode)
			{
			    // RAM mode: Set bank
			    MMU._mbc[1].rambank = val & 3;
			    MMU._ramoffs = MMU._mbc[1].rambank * 0x2000;
			}
			else
			{
			    // ROM mode: Set high bits of bank
			    MMU._mbc[1].rombank =
			    	(MMU._mbc[1].rombank & 0x1F) +
				((val & 3) << 5);
			
			    MMU._romoffs = MMU._mbc[1].rombank * 0x4000;
			}
			break;
		}
		break;

	    // MBC1: Mode switch
	    case 0x6000:
	    case 0x7000:
	        switch(MMU._carttype)
		{
		    case 2:
		    case 3:
		    	MMU._mbc[1].mode = val & 1;
			break;
		}
		break;

	    ...

	    // External RAM
	    case 0xA000:
	    case 0xB000:
	        MMU._eram[MMU._ramoffs + (addr & 0x1FFF)] = val;
		break;
	}
    }
