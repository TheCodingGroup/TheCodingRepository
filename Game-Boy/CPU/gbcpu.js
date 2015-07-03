Z80 = {
    // Time clock: The Z80 holds two types of clock (m and t)
    _clock: {m:0, t:0},

    // Register set
    _r: {
        a:0, b:0, c:0, d:0, e:0, h:0, l:0, f:0,    // 8-bit registers
        pc:0, sp:0,                                // 16-bit registers
        m:0, t:0                                   // Clock for last instr
    }
};
