#version 300 es
out vec2 uv;
void main()
{
	// TRI STRIP 4 FULL SCREEN
	uint id = uint(gl_VertexID);
	uv = vec2((id%2u), (id/2u));
	vec2 p = uv*2.0 - 1.0;
	gl_Position = vec4(p, 0, 1);
}
