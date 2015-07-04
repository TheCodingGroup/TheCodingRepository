KEY = {
    _rows: [0x0F, 0x0F],
    _column: 0,

    reset: function()
    {
        KEY._rows = [0x0F, 0x0F];
	KEY._column = 0;
    },

    rb: function(addr)
    {
        switch(KEY._column)
	{
	    case 0x10: return KEY._rows[0];
	    case 0x20: return KEY._rows[1];
	    default: return 0;
	}
    },

    wb: function(addr, val)
    {
        KEY._column = val & 0x30;
    },

    kdown: function(e)
    {
        // Reset the appropriate bit
    },

    kup: function(e)
    {
        // Set the appropriate bit
    }
};

window.onkeydown = KEY.kdown;
window.onkeyup = KEY.kup;
