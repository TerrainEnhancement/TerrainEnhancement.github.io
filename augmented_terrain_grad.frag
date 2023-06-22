#version 300 es
precision highp float;

// INPUT -----------------------------
in vec2 uv;

// OUPUT -----------------------------
out vec2 out_gradient;

// UNIFORM -----------------------------
uniform sampler2D iTexInput;
uniform float epsilon;

// ---- dérivation -----------------------------
float dF_d(vec2 uv, sampler2D champ, vec2 H)
{
    float f_xph = texture(champ, uv + H).x;
    float f_xmh = texture(champ, uv - H).x;
    return (f_xph - f_xmh);
}


vec2 estimate_derivation(vec2 uv, sampler2D champ)
{
    float d_dx = dF_d(uv, champ, vec2(epsilon,0));
    float d_dy = dF_d(uv, champ, vec2(0,epsilon));
	vec2 der = vec2(d_dx, d_dy)/(2.0*epsilon);
	return der;
}



// MAIN PROGRAM -----------------------------
void main()
{
	out_gradient = estimate_derivation(uv, iTexInput);
}
