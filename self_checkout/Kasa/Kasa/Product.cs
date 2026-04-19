public class Product
{
    public string Name { get; set; }
    public decimal Price { get; set; }
    public bool Restricted { get; set; }

    public override string ToString()
    {
        return $"{Name} - {Price} zł";
    }
}